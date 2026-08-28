import type { Invitation, InvitationStatus } from "@lumen/types";

const store = new Map<string, Invitation>();
const tokenIndex = new Map<string, string>(); // token → invitationId

export const invitationStore = {
  save(inv: Invitation): Invitation {
    // Normalize email case to match identityStore (which lowercases), so the
    // duplicate-invite check in sendInvitation can't be bypassed by inviting
    // User@X.com after user@x.com already has a pending invite (issue #1022).
    const normalized: Invitation = { ...inv, email: inv.email.toLowerCase() };
    store.set(normalized.invitationId, normalized);
    tokenIndex.set(normalized.token, normalized.invitationId);
    return normalized;
  },

  findById(invitationId: string): Invitation | undefined {
    return store.get(invitationId);
  },

  findByToken(token: string): Invitation | undefined {
    const id = tokenIndex.get(token);
    return id ? store.get(id) : undefined;
  },

  findByEmail(clinicId: string, email: string): Invitation | undefined {
    const normalizedEmail = email.toLowerCase();
    return Array.from(store.values()).find(
      (inv) => inv.clinicId === clinicId && inv.email === normalizedEmail
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
