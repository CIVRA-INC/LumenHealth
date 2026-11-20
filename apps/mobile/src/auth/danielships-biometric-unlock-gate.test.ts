import { describe, expect, it } from "vitest";
import { attemptDanielshipsBiometricUnlock, shouldGateOnResume } from "./danielships-biometric-unlock-gate";

describe("danielships biometric unlock gate", () => {
  it("unlocks only on successful biometric auth", async () => {
    const ok = await attemptDanielshipsBiometricUnlock({ isAvailable: async () => true, authenticate: async () => "success" });
    expect(ok.state.locked).toBe(false);
    expect(ok.result).toBe("success");
    const bad = await attemptDanielshipsBiometricUnlock({ isAvailable: async () => true, authenticate: async () => "failed" });
    expect(bad.state.locked).toBe(true);
  });

  it("gates on resume and handles unavailable biometrics", async () => {
    expect(shouldGateOnResume(100, 100, 0)).toBe(true);
    const na = await attemptDanielshipsBiometricUnlock({ isAvailable: async () => false, authenticate: async () => "unavailable" });
    expect(na.result).toBe("unavailable");
  });
});
