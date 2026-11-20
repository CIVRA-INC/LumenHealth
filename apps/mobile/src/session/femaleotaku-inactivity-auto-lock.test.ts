import { describe, expect, it } from "vitest";
import { createFemaleotakuAutoLock, isFemaleotakuSensitiveActionAllowed } from "./femaleotaku-inactivity-auto-lock";

describe("femaleotaku inactivity auto-lock", () => {
  it("locks after inactivity timeout and blocks sensitive actions while locked", () => {
    let t = 0;
    const lock = createFemaleotakuAutoLock({ timeoutMs: 1000, nowMs: () => t });
    t = 1001;
    lock.checkTimeout();
    expect(lock.getSnapshot().state).toBe("locked");
    expect(isFemaleotakuSensitiveActionAllowed(lock.getSnapshot())).toBe(false);
    lock.unlock();
    expect(lock.getSnapshot().state).toBe("unlocked");
  });

  it("warns before timeout and resets timer on activity", () => {
    let t = 0;
    const lock = createFemaleotakuAutoLock({ timeoutMs: 1000, warnBeforeMs: 200, nowMs: () => t });
    t = 850;
    expect(lock.shouldWarn()).toBe(true);
    lock.markActivity();
    expect(lock.shouldWarn()).toBe(false);
  });
});
