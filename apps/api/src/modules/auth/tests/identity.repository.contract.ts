import { beforeEach, describe, expect, it } from "vitest";
import type { IdentityRepository } from "../repositories/identity.repository.interface.js";
import type { AuthIdentity } from "../types/index.js";

const identity = (over: Partial<AuthIdentity> = {}): AuthIdentity => ({
  userId: "u1",
  clinicId: "c1",
  email: "Owner@Example.com",
  passwordHash: "hash",
  role: "owner",
  status: "active",
  createdAt: new Date().toISOString(),
  ...over,
});

/** Shared suite: run it against every IdentityRepository implementation. */
export function runIdentityRepositoryContract(name: string, makeRepo: () => IdentityRepository) {
  describe(`IdentityRepository contract: ${name}`, () => {
    let repo: IdentityRepository;
    beforeEach(() => {
      repo = makeRepo();
      repo._reset();
    });

    it("finds by email case-insensitively", () => {
      repo.save(identity());
      expect(repo.findByEmail("owner@example.com")?.userId).toBe("u1");
      expect(repo.findByEmail("OWNER@EXAMPLE.COM")?.userId).toBe("u1");
    });

    it("finds by id and returns undefined for unknown users", () => {
      repo.save(identity());
      expect(repo.findById("u1")?.clinicId).toBe("c1");
      expect(repo.findById("missing")).toBeUndefined();
      expect(repo.findByEmail("nobody@example.com")).toBeUndefined();
    });

    it("keeps identities isolated per clinic", () => {
      repo.save(identity());
      repo.save(identity({ userId: "u2", clinicId: "c2", email: "other@example.com" }));
      expect(repo.findById("u2")?.clinicId).toBe("c2");
      expect(repo.findById("u1")?.clinicId).toBe("c1");
    });
  });
}
