import type { AuthIdentity } from "../types/index.js";

const store = new Map<string, AuthIdentity>();

export const identityStore = {
  findByEmail(email: string): AuthIdentity | undefined {
    return [...store.values()].find((u) => u.email === email.toLowerCase());
  },

  findById(userId: string): AuthIdentity | undefined {
    return store.get(userId);
  },

  save(identity: AuthIdentity): void {
    store.set(identity.userId, { ...identity, email: identity.email.toLowerCase() });
  },

  _reset(): void {
    store.clear();
  },
};

export function bootstrapClinicOwner(identity: AuthIdentity): void {
  const existing = [...store.values()].find(
    (u) => u.clinicId === identity.clinicId && u.role === "owner"
  );
  if (!existing) {
    identityStore.save({ ...identity, status: "active" });
  }
}
