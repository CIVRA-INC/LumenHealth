import { describe, expect, it } from "vitest";
import { isLoginLocked, lockoutFrom429, parseRetryAfterMs, remainingLockoutSeconds } from "./danielships-login-lockout-countdown";

describe("danielships login lockout countdown", () => {
  it("parses retry-after seconds and computes countdown", () => {
    expect(parseRetryAfterMs({ "retry-after": "30" }, 1000)).toBe(30000);
    const state = lockoutFrom429({ "Retry-After": "10" }, { message: "Locked" }, 5000);
    expect(isLoginLocked(state, 5000)).toBe(true);
    expect(remainingLockoutSeconds(state, 12000)).toBe(3);
  });
});
