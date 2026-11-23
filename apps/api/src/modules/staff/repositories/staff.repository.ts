import { Injectable } from '@nestjs/common';
import type { StaffMember, StaffStatus, UserRole } from "@lumen/types";

export class LastOwnerError extends Error {
  constructor() {
    super("a clinic must keep at least one active owner");
    this.name = "LastOwnerError";
  }
}

/** Records never leave or enter the store by reference (callers cannot mutate stored state). */
const copy = <T>(value: T): T => structuredClone(value);

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
    this.store.set(member.staffId, copy(member));
    return copy(member);
  }

  findById(staffId: string): StaffMember | undefined {
    const found = this.store.get(staffId);
    return found ? copy(found) : undefined;
  }

  findByUserId(userId: string): StaffMember | undefined {
    for (const m of this.store.values()) {
      if (m.userId === userId) return copy(m);
    }
    return undefined;
  }

  delete(staffId: string): void {
    this.store.delete(staffId);
  }

  listByClinic(
    clinicId: string,
    filters?: { status?: StaffStatus; role?: UserRole; q?: string },
  ): StaffMember[] {
    const q = filters?.q?.trim().toLowerCase();
    const results: StaffMember[] = [];
    for (const m of this.store.values()) {
      if (m.clinicId !== clinicId) continue;
      if (filters?.status && m.status !== filters.status) continue;
      if (filters?.role && m.role !== filters.role) continue;
      if (q) {
        const haystack = `${m.name} ${m.email}`.toLowerCase();
        if (!haystack.includes(q)) continue;
      }
      results.push(copy(m));
    }
    results.sort((a, b) => a.joinedAt.localeCompare(b.joinedAt) || a.staffId.localeCompare(b.staffId));
    return results;
  }

  _reset(): void {
    this.store.clear();
  }
}

export const staffStore = new StaffRepository();
