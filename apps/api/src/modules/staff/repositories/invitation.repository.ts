import type { Invitation, InvitationStatus } from "@lumen/types";

const store = new Map<string, Invitation>();
const tokenIndex = new Map<string, string>(); // token → invitationId

export const invitationStore = {
  save(inv: Invitation): Invitation {
    store.set(inv.invitationId, inv);
    tokenIndex.set(inv.token, inv.invitationId);
    return inv;
  },

  findById(invitationId: string): Invitation | undefined {
    return store.get(invitationId);
  },

  findByToken(token: string): Invitation | undefined {
    const id = tokenIndex.get(token);
    return id ? store.get(id) : undefined;
  },

  findByEmail(clinicId: string, email: string): Invitation | undefined {
    return Array.from(store.values()).find(
      (inv) => inv.clinicId === clinicId && inv.email === email
    );
  },

  listByClinic(clinicId: string, filter?: { status?: InvitationStatus }): Invitation[] {
    return Array.from(store.values()).filter(
      (inv) => inv.clinicId === clinicId && (!filter?.status || inv.status === filter.status)
    );
  },

  _reset(): void {
    store.clear();
    tokenIndex.clear();
  },
};
