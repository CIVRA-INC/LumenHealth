import { describe, expect, it } from "vitest";
import { applyFemaleotakuPolicy, evaluateFemaleotakuIntegrity } from "./femaleotaku-device-integrity-policy";

describe("femaleotaku device integrity policy", () => {
  it("detects compromised and unknown states", () => {
    expect(evaluateFemaleotakuIntegrity({ isRooted: true }, 1).state).toBe("compromised");
    expect(evaluateFemaleotakuIntegrity({}, 1).state).toBe("unknown");
    expect(evaluateFemaleotakuIntegrity({ isRooted: false, isJailbroken: false }, 1).state).toBe("secure");
  });

  it("applies documented policy outcomes", () => {
    const compromised = evaluateFemaleotakuIntegrity({ isJailbroken: true }, 1);
    expect(applyFemaleotakuPolicy(compromised, "block").allowApp).toBe(false);
    expect(applyFemaleotakuPolicy(compromised, "block-sensitive").allowSensitive).toBe(false);
  });
});
