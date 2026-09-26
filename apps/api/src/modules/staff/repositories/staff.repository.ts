import { Injectable } from '@nestjs/common';
import type { StaffMember, StaffStatus } from "@lumen/types";

@Injectable()
export class StaffRepository {
  private store = new Map<string, StaffMember>();

  save(member: StaffMember): StaffMember {
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
