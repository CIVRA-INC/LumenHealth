import { beforeEach, describe, expect, it } from "vitest";
import { identityStore } from "../repositories/identity.repository.js";
import type { AuthIdentity } from "../types/index.js";

const identity = (): AuthIdentity =>
  ({
    userId: "u1",
    clinicId: "c1",
    email: "Ann@Clinic.test",
    passwordHash: "hash",
    role: "clinician",
    status: "active",
  }) as AuthIdentity;

describe("identityStore isolation", () => {
  beforeEach(() => identityStore._reset());

  it("mutating returned identities does not change the store", () => {
    identityStore.save(identity());
    identityStore.findById("u1")!.role = "owner";
    identityStore.findByEmail("ann@clinic.test")!.status = "suspended";
    expect(identityStore.findById("u1")).toMatchObject({ role: "clinician", status: "active" });
  });

  it("mutating the object passed to save() does not change the stored copy", () => {
    const input = identity();
    identityStore.save(input);
    input.role = "owner";
    expect(identityStore.findById("u1")!.role).toBe("clinician");
  });
});
