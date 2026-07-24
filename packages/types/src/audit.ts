import type { UserRole } from "./auth.js";

export type AuditAction =
  | "staff.invited"
  | "staff.invitation_accepted"
  | "staff.invitation_revoked"
  | "staff.role_changed"
  | "staff.deactivated"
  | "staff.reactivated"
  | "clinic.updated"
  | "clinic.archived"
  | "auth.password_reset_requested"
  | "auth.password_reset_completed"
  | "batch.anchored";

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
};

/** Fields hashed to derive `AuditEntry.sha256Hash`. */
export type HashableAuditEntry = Omit<
  AuditEntry,
  "sha256Hash" | "stellarTxHash" | "merkleRoot" | "anchoredAt" | "merkleProof"
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
  checkedAt: string;
  reason?: string;
};
