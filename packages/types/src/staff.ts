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
