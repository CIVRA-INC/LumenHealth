import type { StaffMember, UserRole } from "@lumen/types";

export const STAFF_ROLE_LABELS: Record<UserRole, string> = {
  owner: "Owner",
  admin: "Admin",
  clinician: "Clinician",
  cashier: "Cashier",
};

export const STAFF_STATUS_LABELS: Record<StaffMember["status"], string> = {
  active: "Active",
  invited: "Invited",
  deactivated: "Deactivated",
};

export function roleLabel(role: UserRole): string {
  return STAFF_ROLE_LABELS[role] ?? role;
}

export function statusLabel(status: StaffMember["status"]): string {
  return STAFF_STATUS_LABELS[status] ?? status;
}

export function clearRoleChangeError(): string {
  return "";
}

export function canEditStaffRole(member: StaffMember, currentUserId: string): boolean {
  if (member.userId === currentUserId) {
    return false;
  }
  if (member.role === "owner") {
    return false;
  }
  return member.status === "active";
}

export type RoleChangeBanner = {
  message: string;
  role: "alert";
  visible: boolean;
};

export function roleChangeBanner(message: string): RoleChangeBanner {
  return {
    message,
    role: "alert",
    visible: message.trim().length > 0,
  };
}
