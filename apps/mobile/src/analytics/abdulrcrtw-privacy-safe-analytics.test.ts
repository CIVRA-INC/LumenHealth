import { describe, expect, it } from "vitest";
import { buildSafeEvent, canEmitEvents, defaultConsentState, stripPhiProps } from "./abdulrcrtw-privacy-safe-analytics";

describe("abdulrcrtw privacy-safe analytics", () => {
  it("does not emit before consent and respects opt-in/out", () => {
    expect(canEmitEvents(defaultConsentState())).toBe(false);
    expect(canEmitEvents({ decided: true, granted: false })).toBe(false);
    expect(canEmitEvents({ decided: true, granted: true })).toBe(true);
  });

  it("strips PHI-like keys and raw identifiers from event payloads", () => {
    const cleaned = stripPhiProps({ screen: "Login", patientName: "Jane", email: "a@b.com", success: true });
    expect(cleaned).toEqual({ screen: "Login", success: true });
    const evt = buildSafeEvent("screen_view", { screen: "Home", mrn: "123" }, () => "t");
    expect(evt).toEqual({ name: "screen_view", screen: "Home", success: undefined, ts: "t" });
  });
});
