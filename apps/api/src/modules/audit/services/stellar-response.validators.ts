import type {
  AnchoringHealthReport,
  AuditExportVerifyReport,
  BatchAnchorResult,
} from "@lumen/types";

/**
 * Thrown when stellar-service answers with a body that does not have the expected shape (version
 * skew, a proxy error page served with status 200, a truncated payload, non-JSON). The message
 * names the operation only: the response body is never echoed.
 */
export class InvalidStellarResponseError extends Error {
  constructor(operation: string) {
    super(`[audit] stellar-service returned an invalid response for ${operation}`);
    this.name = "InvalidStellarResponseError";
  }
}

type Obj = Record<string, unknown>;

const isObject = (value: unknown): value is Obj => typeof value === "object" && value !== null && !Array.isArray(value);
const isHex = (value: unknown): value is string => typeof value === "string" && /^[0-9a-fA-F]+$/.test(value);
const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.length > 0;
const isBase64 = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && /^[A-Za-z0-9+/_-]+={0,2}$/.test(value);
const isIsoDate = (value: unknown): value is string => typeof value === "string" && !Number.isNaN(Date.parse(value));
const isCount = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0;
const isNullableIso = (value: unknown): value is string | null => value === null || isIsoDate(value);
const isNullableCount = (value: unknown): value is number | null => value === null || isCount(value);

function expect<T>(ok: boolean, operation: string, value: unknown): T {
  if (!ok) throw new InvalidStellarResponseError(operation);
  return value as T;
}

/** `GET /internal/tx/:hash/merkle-root` → `{ merkleRoot }` (non-empty hex). */
export function parseMerkleRootResponse(body: unknown): string {
  return expect<string>(isObject(body) && isHex(body.merkleRoot), "merkle root lookup", isObject(body) ? body.merkleRoot : undefined);
}

/** `POST /internal/sign` → `{ signature (base64), publicKey }`. */
export function parseSignedPayload(body: unknown): { signature: string; publicKey: string } {
  const ok = isObject(body) && isBase64(body.signature) && isNonEmptyString(body.publicKey);
  return expect(ok, "manifest signing", ok ? { signature: (body as Obj).signature, publicKey: (body as Obj).publicKey } : undefined);
}

const isProofStep = (step: unknown): boolean =>
  isObject(step) && isHex(step.hash) && (step.position === "left" || step.position === "right");

/** `POST /internal/verify-export` → an `AuditExportVerifyReport`. */
export function parseExportVerifyReport(body: unknown): AuditExportVerifyReport {
  const operation = "export verification";
  const ok =
    isObject(body) &&
    isNonEmptyString(body.clinicId) &&
    typeof body.signatureValid === "boolean" &&
    typeof body.entriesDigestValid === "boolean" &&
    typeof body.ok === "boolean" &&
    isCount(body.verifiedCount) &&
    isCount(body.unanchoredCount) &&
    isCount(body.tamperedCount) &&
    Array.isArray(body.results) &&
    body.results.every(
      (result) =>
        isObject(result) &&
        isNonEmptyString(result.auditId) &&
        typeof result.action === "string" &&
        (result.status === "verified" || result.status === "unanchored" || result.status === "tampered"),
    );
  return expect<AuditExportVerifyReport>(ok, operation, body);
}

/** `GET /internal/anchoring/health` → an `AnchoringHealthReport`. */
export function parseAnchoringHealth(body: unknown): AnchoringHealthReport {
  const ok =
    isObject(body) &&
    isNullableIso(body.lastSuccessfulTickAt) &&
    isNullableIso(body.lastAnchorAt) &&
    isCount(body.consecutiveFailureCount) &&
    isCount(body.unanchoredCount) &&
    isNullableCount(body.oldestUnanchoredAgeMs) &&
    isCount(body.pendingPersistCount) &&
    isIsoDate(body.checkedAt);
  return expect<AnchoringHealthReport>(ok, "anchoring health", body);
}

/** `POST /internal/anchor-immediate` → a `BatchAnchorResult`. Never apply a result that fails this. */
export function parseBatchAnchorResult(body: unknown): BatchAnchorResult {
  const ok =
    isObject(body) &&
    isHex(body.merkleRoot) &&
    isNonEmptyString(body.stellarTxHash) &&
    isIsoDate(body.anchoredAt) &&
    (body.mode === "immediate" || body.mode === "batched") &&
    Array.isArray(body.entries) &&
    body.entries.every(
      (entry) =>
        isObject(entry) &&
        isNonEmptyString(entry.auditId) &&
        Array.isArray(entry.merkleProof) &&
        entry.merkleProof.every(isProofStep),
    );
  return expect<BatchAnchorResult>(ok, "immediate anchoring", body);
}
