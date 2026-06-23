import { randomUUID } from "crypto";
import type { StaffMember, UpdateStaffRoleRequest, UserRole } from "@lumen/types";
import { staffStore } from "../repositories/staff.repository.js";

export function listStaff(clinicId: string): StaffMember[] {
  return staffStore.listByClinic(clinicId);
}

export function updateStaffRole(
  staffId: string,
  body: UpdateStaffRoleRequest,
  callerClinicId: string,
): StaffMember | { error: string; message: string } {
  const member = staffStore.findById(staffId);

  if (!member || member.clinicId !== callerClinicId) {
    return { error: "STAFF_NOT_FOUND", message: "staff member not found" };
  }

  const updated: StaffMember = {
    ...member,
    role: body.role as UserRole,
    updatedAt: new Date().toISOString(),
  };

  return staffStore.save(updated);
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
