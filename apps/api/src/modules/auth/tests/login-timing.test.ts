import bcrypt from "bcryptjs";
import { describe, expect, it, vi } from "vitest";
import { DUMMY_PASSWORD_HASH, performDummyPasswordCompare } from "../services/login-timing.js";
import { FIXTURE_PASSWORD_HASH } from "./fixtures.js";

/**
 * Login timing equalization (#1341): the unknown-email branch of the login
 * handler must burn the same bcrypt work as a wrong-password compare.
 *
 * The full statistical test from the issue (two-sample timing over the live
 * login handler) cannot run: `auth.controller.ts` does not import on
 * `develop` (it imports the non-existent `bcrypt` package and six
 * `auth/utils/*` modules — pre-existing breakage, out of scope). These tests
 * pin the properties that make the dummy path equivalent at the unit level.
 */
describe("login timing equalizer", () => {
  it("dummy hash has the same format and cost as real application hashes", () => {
    // invitation.service hashes with bcrypt.hash(password, 12); the auth
    // fixtures embed a cost-12 hash. The dummy must match both.
    expect(DUMMY_PASSWORD_HASH).toMatch(/^\$2[ab]\$12\$/);
    expect(FIXTURE_PASSWORD_HASH).toMatch(/^\$2[ab]\$12\$/);
  });

  it("dummy hash is a valid bcrypt hash the compare actually evaluates", async () => {
    // A malformed hash would make bcrypt.compare reject (or short-circuit),
    // destroying the timing equivalence — the precomputed constant must
    // verify against its plaintext.
    await expect(
      bcrypt.compare("lumen-timing-equalizer-dummy", DUMMY_PASSWORD_HASH)
    ).resolves.toBe(true);
  });

  it("performs a real bcrypt.compare against the dummy hash and discards the result", async () => {
    const spy = vi.spyOn(bcrypt, "compare");
    const started = performance.now();

    await performDummyPasswordCompare("attacker-supplied-password");

    const elapsed = performance.now() - started;
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("attacker-supplied-password", DUMMY_PASSWORD_HASH);
    // Cost-12 bcrypt is real work, never a no-op: even the fastest machine
    // cannot finish 4096 bcrypt rounds in single-digit milliseconds.
    expect(elapsed).toBeGreaterThan(5);
    spy.mockRestore();
  });

  it("never throws, whatever it is given", async () => {
    await expect(performDummyPasswordCompare("")).resolves.toBeUndefined();
    await expect(performDummyPasswordCompare("🔐 pass")).resolves.toBeUndefined();
  });
});
