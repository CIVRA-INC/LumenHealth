import type { UserRole } from "./auth.js";

/**
 * Every valid audit action, as a runtime-inspectable tuple. `AuditAction` is
 * derived from this so the type and the runtime list can never drift apart —
 * callers validating untrusted input (e.g. an `?action=` query param) can use
 * `isAuditAction` instead of an unchecked `as AuditAction` cast.
 */
export const AUDIT_ACTIONS = [
  "staff.invited",
  "staff.invitation_accepted",
  "staff.invitation_revoked",
  "staff.role_changed",
  "staff.deactivated",
  "staff.reactivated",
  "clinic.updated",
  "clinic.archived",
  "auth.password_reset_requested",
  "auth.password_reset_completed",
  "batch.anchored",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** Runtime type guard: is `value` one of the known `AuditAction`s? */
export function isAuditAction(value: unknown): value is AuditAction {
  return typeof value === "string" && (AUDIT_ACTIONS as readonly string[]).includes(value);
}

/**
 * Governance-critical actions that get anchored individually and
 * immediately, rather than waiting for the next scheduled batch — a
 * staff-role change or clinic archival should never sit in a window where
 * it's provably un-anchored just because the batch interval hasn't elapsed.
 */
export const CRITICAL_AUDIT_ACTIONS: readonly AuditAction[] = ["staff.role_changed", "clinic.archived"];

export function isCriticalAuditAction(action: AuditAction): boolean {
  return CRITICAL_AUDIT_ACTIONS.includes(action);
}

/**
 * `immediate`: anchored individually, right after the action occurred, via
 * its own single-entry Stellar transaction — see `CRITICAL_AUDIT_ACTIONS`.
 * `batched`: anchored as part of the routine scheduled batch, alongside
 * whatever else was unanchored at the time.
 */
export type AnchorMode = "immediate" | "batched";

/** One step of a Merkle inclusion proof: the sibling hash and which side it sits on. */
export type MerkleProofStep = {
  hash: string;
  position: "left" | "right";
};

export type AuditEntry = {
  auditId: string;
  clinicId: string;
  action: AuditAction;
  actorId: string;
  actorRole: UserRole;
  targetId?: string;
  targetType?: "staff" | "clinic" | "invitation";
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  /**
   * SHA-256 hex digest over the canonical serialization of every other
   * field on this entry (see `hashAuditEntry` in `./hashing.js`). Lets a
   * verifier detect any post-write tampering with `before`/`after` or any
   * other field.
   */
  sha256Hash: string;
  /** Stellar transaction hash of the batch anchor that included this entry. */
  stellarTxHash?: string;
  /** Merkle root written on-chain for the batch that included this entry. */
  merkleRoot?: string;
  /** When this entry's batch was anchored to Stellar. */
  anchoredAt?: string;
  /**
   * Sibling hashes (bottom-up) proving `sha256Hash` is included under
   * `merkleRoot`, without needing to re-anchor or re-fetch the whole batch.
   */
  merkleProof?: MerkleProofStep[];
  /** How this entry was anchored — see `AnchorMode`. Absent until anchored. */
  anchorMode?: AnchorMode;
};

/** Fields hashed to derive `AuditEntry.sha256Hash`. */
export type HashableAuditEntry = Omit<
  AuditEntry,
  "sha256Hash" | "stellarTxHash" | "merkleRoot" | "anchoredAt" | "merkleProof" | "anchorMode"
>;

export type AuditQuery = {
  clinicId: string;
  action?: AuditAction;
  actorId?: string;
  targetId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  /** Filter by anchor status: true = anchored entries only, false = unanchored only. */
  anchored?: boolean;
};

/** Result of anchoring one Merkle-batch of audit entries to Stellar. */
export type BatchAnchorResult = {
  merkleRoot: string;
  stellarTxHash: string;
  anchoredAt: string;
  /** "immediate" for a single-entry batch triggered by a critical action; "batched" for the routine scheduled run. */
  mode: AnchorMode;
  entries: {
    auditId: string;
    merkleProof: MerkleProofStep[];
  }[];
};

/**
 * - `verified`: the entry's stored content hashes to `sha256Hash`, and its
 *   Merkle proof recomputes to the root actually anchored on Stellar.
 * - `tampered`: either the stored content no longer hashes to `sha256Hash`,
 *   or the proof doesn't recompute to the on-chain root — something was
 *   altered after the entry was written or anchored.
 * - `unanchored`: the entry hasn't been included in a batch anchor yet, so
 *   there's nothing on-chain to check it against.
 */
export type AuditVerifyStatus = "verified" | "tampered" | "unanchored";

export type AuditVerifyResponse = {
  auditId: string;
  status: AuditVerifyStatus;
  recomputedHash: string;
  storedHash: string;
  merkleRoot?: string;
  stellarTxHash?: string;
  /** How this entry was anchored — see `AnchorMode`. Absent when `status` is `unanchored`. */
  anchorMode?: AnchorMode;
  checkedAt: string;
  reason?: string;
};

/**
 * Signed manifest for an exported compliance bundle. `entriesDigest` is a
 * SHA-256 hex digest over the canonicalized, auditId-sorted list of
 * `{auditId, sha256Hash}` pairs for every entry in the export — lets a
 * verifier confirm the entry list itself wasn't added to or pruned after
 * the export was signed.
 */
export type AuditExportManifest = {
  clinicId: string;
  generatedAt: string;
  range: { from?: string; to?: string };
  entryCount: number;
  entriesDigest: string;
};

/**
 * A self-contained, externally-verifiable export: the raw entries (with
 * their Merkle proofs and anchoring tx hashes already attached), a manifest
 * summarizing the export, and an ed25519 signature over the manifest from
 * LumenHealth's service keypair — the same keypair used to sign anchoring
 * transactions, so a verifier can cross-check `signingPublicKey` against
 * the source account of the on-chain anchor transactions.
 */
export type AuditExportBundle = {
  manifest: AuditExportManifest;
  /** Base64-encoded ed25519 signature over the canonicalized manifest. */
  signature: string;
  /** Stellar (ed25519) public key of the signer, e.g. "GABC...". */
  signingPublicKey: string;
  entries: AuditEntry[];
};

/** Per-entry outcome of independently re-verifying an `AuditExportBundle`. */
export type AuditExportVerifyEntryResult = {
  auditId: string;
  action: string;
  status: AuditVerifyStatus;
  reason?: string;
};

/**
 * Result of independently re-verifying a whole `AuditExportBundle`: the
 * manifest signature, the entries digest, and every entry's hash + Merkle
 * proof re-checked against on-chain state. Shared between the standalone
 * CLI verifier, the internal stellar-service HTTP endpoint, and the public
 * web verification portal so all three agree on exactly one report shape.
 */
export type AuditExportVerifyReport = {
  clinicId: string;
  signatureValid: boolean;
  entriesDigestValid: boolean;
  results: AuditExportVerifyEntryResult[];
  verifiedCount: number;
  unanchoredCount: number;
  tamperedCount: number;
  /**
   * Whether `signingPublicKey` was an authorized export-signing key at the
   * time the manifest was generated, per a `SigningKeyRecord[]` registry —
   * `undefined` when the caller didn't supply one (a cryptographically
   * valid signature was checked, but against no notion of "was this key
   * ever actually authorized"). A cryptographically valid signature from a
   * key that was never authorized, or was authorized only outside this
   * window (e.g. after rotation), still reports `false` here even though
   * `signatureValid` is `true`.
   */
  signingKeyAuthorized?: boolean;
  /** True only if the signature, digest, every entry, and (when checked) the signing key authorization all check out. */
  ok: boolean;
};
