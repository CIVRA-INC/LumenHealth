import type { StaffMember, StaffStatus } from "@lumen/types";

const store = new Map<string, StaffMember>();

function save(member: StaffMember): StaffMember {
  store.set(member.staffId, member);
  return member;
}

function findById(staffId: string): StaffMember | undefined {
  return store.get(staffId);
}

function findByUserId(userId: string): StaffMember | undefined {
  for (const m of store.values()) {
    if (m.userId === userId) return m;
  }
  return undefined;
}

function listByClinic(
  clinicId: string,
  filters?: { status?: StaffStatus },
): StaffMember[] {
  const results: StaffMember[] = [];
  for (const m of store.values()) {
    if (m.clinicId !== clinicId) continue;
    if (filters?.status && m.status !== filters.status) continue;
    results.push(m);
  }
  return results;
}

function _reset(): void {
  store.clear();
}

export const staffStore = { save, findById, findByUserId, listByClinic, _reset };
