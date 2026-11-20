import { describe, expect, it, vi } from "vitest";
import { DEFAULT_FEMALEOTAKU_PHI_POLICIES, applyFemaleotakuPhiPrivacy, isPhiRoute } from "./femaleotaku-phi-screen-privacy";

describe("femaleotaku PHI screen privacy", () => {
  it("identifies PHI routes from policy", () => {
    expect(isPhiRoute("PatientChart", DEFAULT_FEMALEOTAKU_PHI_POLICIES)).toBe(true);
    expect(isPhiRoute("Login", DEFAULT_FEMALEOTAKU_PHI_POLICIES)).toBe(false);
  });

  it("enables blur and screenshot blocking on PHI screens", async () => {
    const cap = { setTaskSwitcherBlur: vi.fn(), setScreenshotBlocking: vi.fn() };
    const res = await applyFemaleotakuPhiPrivacy("Encounter", DEFAULT_FEMALEOTAKU_PHI_POLICIES, cap);
    expect(res).toEqual({ blurred: true, screenshotsBlocked: true });
    expect(cap.setTaskSwitcherBlur).toHaveBeenCalledWith(true);
  });
});
