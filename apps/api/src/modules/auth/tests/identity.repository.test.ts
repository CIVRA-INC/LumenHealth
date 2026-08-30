import { describe, it, expect, beforeEach } from "vitest";
import { identityStore } from "../repositories/identity.repository.js";
import type { AuthIdentity } from "../types/index.js";

function makeIdentity(overrides: Partial<AuthIdentity> = {}): AuthIdentity {
  return {
    userId: "u1",
    clinicId: "c1",
    email: "User@Clinic.test",
    passwordHash: "hash",
    role: "owner",
    status: "active",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("identityStore.findByEmail (issue #1020)", () => {
  beforeEach(() => identityStore._reset());

  it("looks up case-insensitively via the email index", () => {
    identityStore.save(makeIdentity());
    expect(identityStore.findByEmail("user@clinic.test")?.userId).toBe("u1");
    expect(identityStore.findByEmail("USER@CLINIC.TEST")?.userId).toBe("u1");
  });

  it("returns undefined for an unknown email", () => {
    identityStore.save(makeIdentity());
    expect(identityStore.findByEmail("nobody@clinic.test")).toBeUndefined();
  });

  it("drops the stale index entry when a user's email changes", () => {
    identityStore.save(makeIdentity({ email: "old@clinic.test" }));
    identityStore.save(makeIdentity({ email: "new@clinic.test" }));

    expect(identityStore.findByEmail("old@clinic.test")).toBeUndefined();
    expect(identityStore.findByEmail("new@clinic.test")?.userId).toBe("u1");
  });
});
