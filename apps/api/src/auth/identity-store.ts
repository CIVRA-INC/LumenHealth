// Auth 026 — Persistence model for auth identities and clinic-owner bootstrap
// Closes #461
//
// In-memory store for the MVP. Replace with a real DB adapter in a later milestone.

import type { UserRole } from "@lumen/types";

// ── Identity record ──────────────────────────────────────────────────────────

export type AccountStatus = "pending" | "active" | "suspended" | "locked";

export type AuthIdentity = {
  userId: string;
  clinicId: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: AccountStatus;
  createdAt: string; // ISO-8601
};

// ── In-memory store ──────────────────────────────────────────────────────────

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

  /** Exposed for tests only — clears all records. */
  _reset(): void {
    store.clear();
  },
};

// ── Clinic-owner bootstrap ───────────────────────────────────────────────────

/**
 * Seeds the first owner identity for a new clinic.
 * Idempotent: no-op if an owner for the clinic already exists.
 */
export function bootstrapClinicOwner(identity: AuthIdentity): void {
  const existing = [...store.values()].find(
    (u) => u.clinicId === identity.clinicId && u.role === "owner"
  );
  if (!existing) {
    identityStore.save({ ...identity, status: "active" });
  }
}
