import { Injectable } from '@nestjs/common';
import type { StaffMember, StaffStatus } from "@lumen/types";

export class LastOwnerError extends Error {
  constructor() {
    super("a clinic must keep at least one active owner");
    this.name = "LastOwnerError";
  }
}

const isActiveOwner = (m: StaffMember) => m.role === "owner" && m.status === "active";

@Injectable()
export class StaffRepository {
  private store = new Map<string, StaffMember>();

  /** Rejects any write that would leave the clinic without an active owner (check and write are one synchronous step). */
  save(member: StaffMember): StaffMember {
    const previous = this.store.get(member.staffId);
    if (previous && isActiveOwner(previous) && !isActiveOwner(member)) {
      const hasOtherOwner = Array.from(this.store.values()).some(
        (m) => m.clinicId === previous.clinicId && m.staffId !== previous.staffId && isActiveOwner(m),
      );
      if (!hasOtherOwner) throw new LastOwnerError();
    }
    this.store.set(member.staffId, member);
    return member;
  }

  findById(staffId: string): StaffMember | undefined {
    return this.store.get(staffId);
  }

  findByUserId(userId: string): StaffMember | undefined {
    for (const m of this.store.values()) {
      if (m.userId === userId) return m;
    }
    return undefined;
  }

  listByClinic(
    clinicId: string,
    filters?: { status?: StaffStatus },
  ): StaffMember[] {
    const results: StaffMember[] = [];
    for (const m of this.store.values()) {
      if (m.clinicId !== clinicId) continue;
      if (filters?.status && m.status !== filters.status) continue;
      results.push(m);
    }
    return results;
  }

  _reset(): void {
    this.store.clear();
  }
}

export const staffStore = new StaffRepository();
