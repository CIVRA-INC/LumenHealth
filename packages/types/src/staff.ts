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

export type UpdateStaffRoleRequest = {
  role: UserRole;
};

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

export type SendInvitationRequest = {
  email: string;
  role: Exclude<UserRole, "owner">;
};

export type AcceptInvitationRequest = {
  token: string;
  password: string;
  name: string;
};

// ── Errors ────────────────────────────────────────────────────────────────────

export type StaffErrorCode =
  | "STAFF_NOT_FOUND"
  | "STAFF_ALREADY_EXISTS"
  | "STAFF_ACCESS_DENIED"
  | "STAFF_CANNOT_DEACTIVATE_SELF"
  | "STAFF_ROLE_INVALID";

export type InvitationErrorCode =
  | "INVITATION_NOT_FOUND"
  | "INVITATION_EXPIRED"
  | "INVITATION_ALREADY_ACCEPTED"
  | "INVITATION_ALREADY_PENDING"
  | "INVITATION_REVOKED";

export type StaffError = {
  error: StaffErrorCode | InvitationErrorCode;
  message: string;
};
