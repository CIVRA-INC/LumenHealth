import { randomUUID } from "crypto";
import type { StaffMember, UpdateStaffRoleRequest, UserRole } from "@lumen/types";
import { staffStore } from "../repositories/staff.repository.js";
import { recordAudit } from "../../audit/services/audit.service.js";

export function listStaff(clinicId: string): StaffMember[] {
  return staffStore.listByClinic(clinicId);
}

export function updateStaffRole(
  staffId: string,
  body: UpdateStaffRoleRequest,
  callerClinicId: string,
  callerUserId: string,
  callerRole: UserRole,
): StaffMember | { error: string; message: string } {
  const member = staffStore.findById(staffId);

  if (!member || member.clinicId !== callerClinicId) {
    return { error: "STAFF_NOT_FOUND", message: "staff member not found" };
  }

  if (member.userId === callerUserId) {
    return { error: "STAFF_CANNOT_SELF_UPDATE", message: "you cannot change your own role" };
  }

  const previousRole = member.role;
  const updated: StaffMember = {
    ...member,
    role: body.role as UserRole,
    updatedAt: new Date().toISOString(),
  };

  const saved = staffStore.save(updated);

  // Governance-critical — see CRITICAL_AUDIT_ACTIONS in @lumen/types. Fires
  // an immediate, individual Stellar anchor rather than waiting for the
  // routine batch.
  recordAudit({
    clinicId: callerClinicId,
    action: "staff.role_changed",
    actorId: callerUserId,
    actorRole: callerRole,
    targetId: staffId,
    targetType: "staff",
    before: { role: previousRole },
    after: { role: saved.role },
  });

  return saved;
}

export function createStaffFromInvitation(
  userId: string,
  clinicId: string,
  email: string,
  name: string,
  role: UserRole,
): StaffMember {
  const now = new Date().toISOString();
  return staffStore.save({
    staffId: randomUUID(),
    clinicId,
    userId,
    name,
    email,
    role,
    status: "active",
    joinedAt: now,
    updatedAt: now,
  });
}
