import type { AuthIdentity } from "../types/index.js";

const store = new Map<string, AuthIdentity>();
// Secondary index: lowercased email → userId, so findByEmail is O(1) instead of
// an O(n) scan over every user on each login/register/invite/reset (issue #1020).
const emailIndex = new Map<string, string>();

export const identityStore = {
  findByEmail(email: string): AuthIdentity | undefined {
    const userId = emailIndex.get(email.toLowerCase());
    return userId ? store.get(userId) : undefined;
  },

  findById(userId: string): AuthIdentity | undefined {
    return store.get(userId);
  },

  save(identity: AuthIdentity): void {
    const email = identity.email.toLowerCase();
    // If this userId previously had a different email, drop its stale index entry.
    const previous = store.get(identity.userId);
    if (previous && previous.email !== email) {
      emailIndex.delete(previous.email);
    }
    store.set(identity.userId, { ...identity, email });
    emailIndex.set(email, identity.userId);
  },

  _reset(): void {
    store.clear();
    emailIndex.clear();
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
