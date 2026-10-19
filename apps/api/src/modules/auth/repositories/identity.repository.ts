import type { AuthIdentity } from "../types/index.js";

const store = new Map<string, AuthIdentity>();
/** Normalized (lower-cased) email -> userId. Unique, O(1) lookup. */
const emailIndex = new Map<string, string>();

export class DuplicateEmailError extends Error {
  constructor(email: string) {
    super(`email already registered: ${email}`);
    this.name = "DuplicateEmailError";
  }
}

export const identityStore = {
  findByEmail(email: string): AuthIdentity | undefined {
    const userId = emailIndex.get(email.toLowerCase());
    return userId ? store.get(userId) : undefined;
  },

  findById(userId: string): AuthIdentity | undefined {
    return store.get(userId);
  },

  /** Throws DuplicateEmailError when another identity already owns the email (synchronous, so race-free). */
  save(identity: AuthIdentity): void {
    const emailLower = identity.email.toLowerCase();
    const owner = emailIndex.get(emailLower);
    if (owner && owner !== identity.userId) throw new DuplicateEmailError(emailLower);
    const previous = store.get(identity.userId);
    if (previous) emailIndex.delete(previous.email.toLowerCase());
    store.set(identity.userId, { ...identity, email: emailLower });
    emailIndex.set(emailLower, identity.userId);
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
