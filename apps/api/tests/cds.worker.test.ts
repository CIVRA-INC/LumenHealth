import { describe, expect, it } from "vitest";
import { __testables } from "../src/modules/ai/cds.worker";

describe("cds.worker helpers", () => {
  it("parses strict JSON responses", () => {
    const parsed = __testables.parseJsonResponse(
      JSON.stringify({ hasAlert: true, message: "AI Alert: test" }),
    );

    expect(parsed).toEqual({
      hasAlert: true,
      message: "AI Alert: test",
    });
  });

  it("extracts JSON when model wraps output with extra text", () => {
    const parsed = __testables.maybeExtractJson(
      `Output:\n{"hasAlert":false,"message":""}\nEOF`,
    );

    expect(parsed).toEqual({
      hasAlert: false,
      message: "",
    });
  });

  it("falls back to rule engine for critical fever + tachycardia", () => {
    const decision = __testables.fallbackRuleAlert({
      temperature: 39.4,
      heartRate: 132,
    });

    expect(decision.hasAlert).toBe(true);
    expect(decision.message.toLowerCase()).toContain("sepsis");
  });
});

