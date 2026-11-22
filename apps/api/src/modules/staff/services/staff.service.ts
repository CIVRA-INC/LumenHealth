import { Injectable } from '@nestjs/common';
import { randomUUID } from "crypto";
import type { StaffError, StaffMember, StaffStatus, UpdateStaffRoleRequest, UserRole } from "@lumen/types";
import { LastOwnerError, StaffRepository } from "../repositories/staff.repository.js";
import { AuditService } from "../../audit/services/audit.service.js";
import { paginateByCursor } from "../../../shared/pagination/cursor.js";
import { RolePolicyService } from "../../../shared/role-policy/role-policy.service.js";

@Injectable()
export class StaffService {
  private readonly rolePolicy: RolePolicyService;

  constructor(
    private readonly staffRepository: StaffRepository,
    private readonly auditService: AuditService,
    rolePolicy?: RolePolicyService,
  ) {
    this.rolePolicy = rolePolicy ?? new RolePolicyService();
  }

  listStaff(
    clinicId: string,
    filters?: { status?: StaffStatus; role?: UserRole; q?: string },
  ): StaffMember[] {
    const status = filters?.status ?? "active";
    return this.staffRepository.listByClinic(clinicId, { ...filters, status });
  }

  listStaffPage(clinicId: string, opts: { cursor?: string; limit?: number; status?: StaffStatus; role?: UserRole; q?: string } = {}) {
    const status = opts.status ?? "active";
    const sorted = this.staffRepository.listByClinic(clinicId, { status, role: opts.role, q: opts.q });
    return paginateByCursor(sorted, (m) => `${m.joinedAt}|${m.staffId}`, opts.cursor, opts.limit);
  }

  updateStaffRole(
    staffId: string,
    body: UpdateStaffRoleRequest,
    callerClinicId: string,
    callerUserId: string,
    callerRole: UserRole,
  ): StaffMember | StaffError {
    const member = this.staffRepository.findById(staffId);

    if (!member || member.clinicId !== callerClinicId) {
      return { error: "STAFF_NOT_FOUND", message: "staff member not found" };
    }

    if (member.userId === callerUserId) {
      return { error: "STAFF_CANNOT_SELF_UPDATE", message: "you cannot change your own role" };
    }

    if (!this.rolePolicy.canAssignRole(callerRole, body.role as UserRole)) {
      return { error: "STAFF_ACCESS_DENIED", message: "insufficient role to assign requested role" };
    }

    const previousRole = member.role;
    const updated: StaffMember = {
      ...member,
      role: body.role as UserRole,
      updatedAt: new Date().toISOString(),
    };

    let saved: StaffMember;
    try {
      saved = this.staffRepository.save(updated);
    } catch (err) {
      if (err instanceof LastOwnerError) return { error: "STAFF_LAST_OWNER", message: err.message };
      throw err;
    }

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
