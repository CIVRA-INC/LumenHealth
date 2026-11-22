import type { UserRole } from "./auth.js";

// ── Staff member ──────────────────────────────────────────────────────────────

export type StaffStatus = "active" | "deactivated";

export type StaffMember = {
  staffId: string;
  clinicId: string;
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  status: StaffStatus;
  joinedAt: string;
  updatedAt: string;
};

// UpdateStaffRoleRequest is derived from ./schemas/staff.ts.

// ── Invitations ───────────────────────────────────────────────────────────────

export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export type Invitation = {
  invitationId: string;
  clinicId: string;
  email: string;
  role: UserRole;
  token: string;
  status: InvitationStatus;
  invitedBy: string;
  expiresAt: string;
  createdAt: string;
  acceptedAt?: string;
};

// SendInvitationRequest and AcceptInvitationRequest are derived from
// ./schemas/invitation.ts.

export type StaffErrorCode =
  | "STAFF_NOT_FOUND"
  | "STAFF_CANNOT_SELF_UPDATE"
  | "STAFF_LAST_OWNER"
  | "STAFF_ALREADY_EXISTS"
  | "STAFF_ACCESS_DENIED"
  | "STAFF_ROLE_INVALID"
  | "VALIDATION_FAILED";

export type StaffError = {
  error: StaffErrorCode;
  message: string;
  field?: string;
};

export type InvitationErrorCode =
  | "INVITATION_NOT_FOUND"
  | "INVITATION_EXPIRED"
  | "INVITATION_ALREADY_PENDING"
  | "INVITATION_ALREADY_ACCEPTED"
  | "INVITATION_REVOKED"
  | "INVITATION_INVALID_INPUT"
  | "STAFF_ALREADY_EXISTS"
  | "STAFF_ACCESS_DENIED"
  | "VALIDATION_FAILED";

export type InvitationError = {
  error: InvitationErrorCode;
  message: string;
  field?: string;
};
