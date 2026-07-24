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
  | "auth.password_reset_completed";

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
};

/** Fields hashed to derive `AuditEntry.sha256Hash`. */
export type HashableAuditEntry = Omit<AuditEntry, "sha256Hash">;

export type AuditQuery = {
  clinicId: string;
  action?: AuditAction;
  actorId?: string;
  targetId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};
