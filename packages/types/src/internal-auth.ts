/**
 * Service-to-service request authentication (#1345).
 *
 * Replaces the static `x-internal-service-token` header with short-lived
 * signed requests: HMAC-SHA256 over (method, path, body hash, timestamp,
 * nonce). Both directions (api ↔ stellar-service) sign with the same scheme,
 * verification accepts two active secrets so a secret can be rotated
 * without a coordinated restart, and every verifier rejects stale
 * timestamps and previously-seen nonces (replay protection).
 */
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { sha256Hash } from "./hashing.js";

/** Request timestamp, unix seconds as a string. */
export const INTERNAL_AUTH_TIMESTAMP_HEADER = "x-internal-timestamp";
/** Single-use random nonce per request. */
export const INTERNAL_AUTH_NONCE_HEADER = "x-internal-nonce";
/** Hex HMAC-SHA256 signature. */
export const INTERNAL_AUTH_SIGNATURE_HEADER = "x-internal-signature";
/** Id of the active secret that signed the request (supports rotation). */
export const INTERNAL_AUTH_KEY_ID_HEADER = "x-internal-key-id";

/**
 * How far a request timestamp may drift from the verifier's clock, in
 * seconds. Wide enough for clock skew between processes, tight enough that
 * a captured signature cannot be replayed later.
 */
export const TIMESTAMP_TOLERANCE_SECONDS = 300;

/** An active shared secret. Older entries are kept during rotation. */
export type InternalAuthSecret = {
  /** Stable id recorded alongside the secret (env-supplied, e.g. "2026-10"). */
  keyId: string;
  secret: string;
};

export type InternalAuthHeaders = Record<string, string>;

/**
 * Canonical signing string. Any layout change is a breaking change for
 * every caller — bump the leading version tag instead.
 */
export function internalAuthSigningString(input: {
  method: string;
  path: string;
  bodyHash: string;
  timestamp: string;
  nonce: string;
}): string {
  return [
    "v1",
    input.method.toUpperCase(),
    input.path,
    input.bodyHash,
    input.timestamp,
    input.nonce,
  ].join("\n");
}

/**
 * Digest of a request body used inside the signature. The body is
 * canonicalized first (sorted keys, `undefined` dropped), so both sides
 * agree regardless of property order. An absent body signs as `null`.
 */
export function hashRequestBody(body: unknown): string {
  return sha256Hash(body ?? null);
}

/**
 * Builds the headers for an outgoing internal request. `nowMs`/`nonce` are
 * injectable for tests; callers normally omit them.
 */
export function signInternalRequest(
  input: { method: string; path: string; body?: unknown },
  credentials: InternalAuthSecret,
  options: { nowMs?: number; nonce?: string } = {},
): InternalAuthHeaders {
  const timestamp = String(Math.floor((options.nowMs ?? Date.now()) / 1000));
  const nonce = options.nonce ?? randomUUID();
  const signature = createHmac("sha256", credentials.secret)
    .update(
      internalAuthSigningString({
        method: input.method,
        path: input.path,
        bodyHash: hashRequestBody(input.body),
        timestamp,
        nonce,
      }),
      "utf8",
    )
    .digest("hex");

  return {
    [INTERNAL_AUTH_KEY_ID_HEADER]: credentials.keyId,
    [INTERNAL_AUTH_TIMESTAMP_HEADER]: timestamp,
    [INTERNAL_AUTH_NONCE_HEADER]: nonce,
    [INTERNAL_AUTH_SIGNATURE_HEADER]: signature,
  };
}

/**
 * In-memory nonce replay cache. A nonce is retained for the timestamp
 * tolerance window, after which its signature would be rejected as stale
 * anyway, so expired entries are pruned lazily on access. One instance per
 * process is expected to be shared by all request verifiers.
 */
export class NonceReplayCache {
  private readonly seen = new Map<string, number>();

  constructor(
    private readonly toleranceSeconds: number = TIMESTAMP_TOLERANCE_SECONDS,
  ) {}

  /**
   * Records `nonce` (expiring at `timestamp` + tolerance) and returns
   * `true` when it had not been seen before, `false` on a replay.
   */
  checkAndRecord(nonce: string, timestampSeconds: number, nowMs: number = Date.now()): boolean {
    this.prune(nowMs);
    if (this.seen.has(nonce)) return false;
    this.seen.set(nonce, timestampSeconds + this.toleranceSeconds);
    return true;
  }

  get size(): number {
    return this.seen.size;
  }

  private prune(nowMs: number): void {
    const now = Math.floor(nowMs / 1000);
    for (const [nonce, expiresAt] of this.seen) {
      if (expiresAt < now) this.seen.delete(nonce);
    }
  }
}

export type VerifyInternalRequestResult =
  | { ok: true; keyId: string }
  | { ok: false; reason: string };

/**
 * Verifies an inbound internal request against the active secrets.
 *
 * Rejects (in order): missing/malformed auth headers, unknown key id,
 * stale or future timestamps, replayed nonces, and finally any signature
 * that doesn't match under the key id's secret. The key id is only used to
 * select a secret — the signature itself is what authenticates.
 */
export function verifyInternalRequest(
  input: {
    method: string;
    path: string;
    body?: unknown;
    headers: Record<string, string | string[] | undefined>;
  },
  secrets: readonly InternalAuthSecret[],
  options: {
    nowMs?: number;
    toleranceSeconds?: number;
    replayCache?: NonceReplayCache;
  } = {},
): VerifyInternalRequestResult {
  const header = (name: string): string | undefined => {
    const value = input.headers[name];
    return Array.isArray(value) ? value[0] : value;
  };

  const keyId = header(INTERNAL_AUTH_KEY_ID_HEADER);
  const timestamp = header(INTERNAL_AUTH_TIMESTAMP_HEADER);
  const nonce = header(INTERNAL_AUTH_NONCE_HEADER);
  const signature = header(INTERNAL_AUTH_SIGNATURE_HEADER);

  if (!keyId || !timestamp || !nonce || !signature) {
    return { ok: false, reason: "missing internal auth headers" };
  }

  const credentials = secrets.find((s) => s.keyId === keyId);
  if (!credentials) {
    return { ok: false, reason: `unknown internal auth key id: ${keyId}` };
  }

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) {
    return { ok: false, reason: "malformed timestamp" };
  }
  const tolerance = options.toleranceSeconds ?? TIMESTAMP_TOLERANCE_SECONDS;
  const nowSeconds = Math.floor((options.nowMs ?? Date.now()) / 1000);
  if (Math.abs(nowSeconds - timestampSeconds) > tolerance) {
    return { ok: false, reason: "stale or future-dated request timestamp" };
  }

  if (options.replayCache && !options.replayCache.checkAndRecord(nonce, timestampSeconds, options.nowMs)) {
    return { ok: false, reason: "replayed nonce" };
  }

  const expected = createHmac("sha256", credentials.secret)
    .update(
      internalAuthSigningString({
        method: input.method,
        path: input.path,
        bodyHash: hashRequestBody(input.body),
        timestamp,
        nonce,
      }),
      "utf8",
    )
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(signature, "utf8");
  if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
    return { ok: false, reason: "invalid request signature" };
  }

  return { ok: true, keyId };
}
