import jwt from "jsonwebtoken";
import { createHash, randomUUID } from "node:crypto";

export type TokenPayload = {
  sub: string;
  clinicId: string;
  role: string;
  /**
   * Session id claim. Callers that know the session at sign time (e.g. token
   * refresh) pass it; the login flow's "session id equals the access token"
   * construction predates this claim and cannot populate it at first issue.
   */
  sid?: string;
  /** Issuer/audience — set by the signer, enforced on verify. */
  iss?: string;
  aud?: string;
  /** Unique token id, minted at sign time. */
  jti?: string;
};

export const ACCESS_TOKEN_ISSUER = "lumenhealth-api";
export const ACCESS_TOKEN_AUDIENCE = "lumenhealth-api-access";

export interface AccessTokenSigner {
  sign(payload: TokenPayload): string;
  verify(token: string): TokenPayload | null;
}

export type SigningKey = { kid: string; secret: string };

/**
 * Stable, configuration-free key id: the first 8 hex chars of the secret's
 * SHA-256. Two different secrets can never share a kid in practice, and
 * rotation needs no extra env plumbing — set the new secret, derive its kid.
 */
export function deriveKid(secret: string): string {
  return `k${createHash("sha256").update(secret).digest("hex").slice(0, 8)}`;
}

const MIN_SECRET_LENGTH = 32;

/** Secrets that must never be used to start the API (found in git history). */
const FORBIDDEN_SECRETS = new Set([
  "dev-local-secret-change-in-production",
]);

export function assertStrongSecret(secret: string | undefined, envVar: string): string {
  if (!secret) {
    throw new Error(
      `${envVar} is required — refusing to start without an access-token signing secret`
    );
  }
  if (FORBIDDEN_SECRETS.has(secret)) {
    throw new Error(
      `${envVar} is set to a known default secret — refusing to start (see docs/auth-secret-rotation.md)`
    );
  }
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `${envVar} must be at least ${MIN_SECRET_LENGTH} characters — refusing to start (see docs/auth-secret-rotation.md)`
    );
  }
  return secret;
}

/**
 * Hardened access-token signer (#1337):
 * - algorithm pinned to HS256 on verify (`none`, HS512, RSA-confused all rejected);
 * - `iss`/`aud` enforced on verify, set on sign, plus `jti` on every token;
 * - `kid` header with a key ring: several active secrets verify, the first
 *   signs — zero-downtime rotation per docs/auth-secret-rotation.md;
 * - unknown `kid` (or a token without one) is rejected before any crypto.
 *
 * Tokens issued before this hardening (no kid/iss/aud) are rejected — see
 * the rotation runbook for the one-time re-login note.
 */
export class JwtAccessTokenSigner implements AccessTokenSigner {
  private readonly keys: Map<string, string>;
  private readonly active: SigningKey;
  private readonly expiresIn: string;

  /** `keys[0]` signs; every key in the ring verifies (rotation window). */
  constructor(keys: readonly SigningKey[], expiresIn: string = "15m") {
    if (keys.length === 0) {
      throw new Error("JwtAccessTokenSigner requires at least one signing key");
    }
    this.expiresIn = expiresIn;
    this.keys = new Map(keys.map((k) => [k.kid, k.secret]));
    this.active = keys[0];
  }

  sign(payload: TokenPayload): string {
    return jwt.sign({ ...payload, jti: randomUUID() }, this.active.secret, {
      algorithm: "HS256",
      keyid: this.active.kid,
      issuer: ACCESS_TOKEN_ISSUER,
      audience: ACCESS_TOKEN_AUDIENCE,
      expiresIn: this.expiresIn as jwt.SignOptions["expiresIn"],
    });
  }

  verify(token: string): TokenPayload | null {
    const header = jwt.decode(token, { complete: true })?.header;
    if (!header?.kid || typeof header.kid !== "string") return null;
    const secret = this.keys.get(header.kid);
    if (!secret) return null; // unknown kid — rejected without touching crypto
    try {
      return jwt.verify(token, secret, {
        algorithms: ["HS256"], // alg pinning: "none" and any alg confusion die here
        issuer: ACCESS_TOKEN_ISSUER,
        audience: ACCESS_TOKEN_AUDIENCE,
      }) as TokenPayload;
    } catch {
      return null;
    }
  }
}

function buildKeyRing(): JwtAccessTokenSigner {
  const active = assertStrongSecret(process.env.AUTH_ACCESS_TOKEN_KEY, "AUTH_ACCESS_TOKEN_KEY");
  const previous = process.env.AUTH_ACCESS_TOKEN_KEY_PREVIOUS;
  const keys: SigningKey[] = [{ kid: deriveKid(active), secret: active }];
  if (previous) {
    keys.push({
      kid: deriveKid(previous),
      secret: assertStrongSecret(previous, "AUTH_ACCESS_TOKEN_KEY_PREVIOUS"),
    });
  }
  return new JwtAccessTokenSigner(keys);
}

// Built at module load: a missing, short or known-default secret fails the
// process at startup instead of quietly signing forgeable tokens.
export const accessTokenSigner: AccessTokenSigner = buildKeyRing();
