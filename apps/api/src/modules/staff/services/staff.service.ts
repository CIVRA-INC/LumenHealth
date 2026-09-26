import { Injectable } from '@nestjs/common';
import { randomUUID } from "crypto";
import type { StaffMember, UpdateStaffRoleRequest, UserRole } from "@lumen/types";
import { StaffRepository } from "../repositories/staff.repository.js";
import { AuditService } from "../../audit/services/audit.service.js";

@Injectable()
export class StaffService {
  constructor(
    private readonly staffRepository: StaffRepository,
    private readonly auditService: AuditService
  ) {}

  listStaff(clinicId: string): StaffMember[] {
    return this.staffRepository.listByClinic(clinicId);
  }

  updateStaffRole(
    staffId: string,
    body: UpdateStaffRoleRequest,
    callerClinicId: string,
    callerUserId: string,
    callerRole: UserRole,
  ): StaffMember | { error: string; message: string } {
    const member = this.staffRepository.findById(staffId);

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

    const saved = this.staffRepository.save(updated);

    this.auditService.recordAudit({
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

  createStaffFromInvitation(
    userId: string,
    clinicId: string,
    email: string,
    name: string,
    role: UserRole,
  ): StaffMember {
    const now = new Date().toISOString();
    return this.staffRepository.save({
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
}
