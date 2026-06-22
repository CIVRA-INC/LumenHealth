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
};

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
