import { describe, it, expect } from "vitest";
import {
  CONSENT_SCOPES,
  CONSENT_TYPES,
  createInitialState,
  fixtures,
  getSummary,
  isAllowedScope,
  isFutureIsoDate,
  nextStep,
  prevStep,
  validateStep,
} from "../ui/consent";

describe("consent UI flow — state machine (#702)", () => {
  it("starts on the type step with empty errors", () => {
    const s = createInitialState("patient-123");
    expect(s.step).toBe("type");
    expect(s.draft.patientId).toBe("patient-123");
    expect(s.errors).toEqual([]);
  });

  it("walks forward through every step then returns null at the end", () => {
    expect(nextStep("type")).toBe("scope");
    expect(nextStep("scope")).toBe("expiry");
    expect(nextStep("expiry")).toBe("review");
    expect(nextStep("review")).toBe("confirm");
    expect(nextStep("confirm")).toBe("done");
    expect(nextStep("done")).toBeNull();
  });

  it("walks backward through every step then returns null at the start", () => {
    expect(prevStep("done")).toBe("confirm");
    expect(prevStep("confirm")).toBe("review");
    expect(prevStep("review")).toBe("expiry");
    expect(prevStep("expiry")).toBe("scope");
    expect(prevStep("scope")).toBe("type");
    expect(prevStep("type")).toBeNull();
  });
});

describe("consent UI flow — validateStep (#702)", () => {
  it("requires a patient id at every step", () => {
    const errs = validateStep("type", {
      patientId: "",
      consentType: "data_processing",
      scopes: [],
      expiresAt: "",
    });
    expect(errs).toContain("Patient is required");
  });

  it("requires a consent type before leaving the type step", () => {
    const errs = validateStep("type", fixtures.draftMissingType);
    expect(errs).toContain("Consent type is required");
  });

  it("requires at least one scope before leaving the scope step", () => {
    const errs = validateStep("scope", {
      patientId: "patient-123",
      consentType: "data_processing",
      scopes: [],
      expiresAt: "",
    });
    expect(errs).toContain("At least one scope is required");
  });

  it("rejects unknown scope tags", () => {
    const errs = validateStep("scope", fixtures.draftInvalidScope);
    expect(errs.some((e) => e.includes("not recognized"))).toBe(true);
  });

  it("accepts an empty expiry (no expiry)", () => {
    const errs = validateStep("expiry", fixtures.draftValid);
    expect(errs).toEqual([]);
  });

  it("rejects an expiry date in the past", () => {
    const errs = validateStep(
      "expiry",
      {
        ...fixtures.draftValid,
        expiresAt: "2000-01-01",
      },
      new Date("2026-06-30T00:00:00Z"),
    );
    expect(errs).toContain("Expiry date must be in the future");
  });

  it("accepts an expiry date in the future", () => {
    const errs = validateStep(
      "expiry",
      fixtures.draftWithExpiry,
      new Date("2026-06-30T00:00:00Z"),
    );
    expect(errs).toEqual([]);
  });
});

describe("consent UI flow — helpers (#702)", () => {
  it("isAllowedScope only accepts enumerated scopes", () => {
    expect(isAllowedScope("demographics")).toBe(true);
    expect(isAllowedScope("billing")).toBe(true);
    expect(isAllowedScope("not_real")).toBe(false);
    expect(isAllowedScope("")).toBe(false);
  });

  it("isFutureIsoDate accepts ISO yyyy-mm-dd in the future", () => {
    expect(isFutureIsoDate("2030-01-01", new Date("2026-06-30T00:00:00Z"))).toBe(true);
  });

  it("isFutureIsoDate rejects malformed strings", () => {
    expect(isFutureIsoDate("01/01/2030")).toBe(false);
    expect(isFutureIsoDate("yesterday")).toBe(false);
    expect(isFutureIsoDate("")).toBe(false);
  });

  it("getSummary renders type, scopes, expiry", () => {
    expect(getSummary(fixtures.draftValid)).toContain("data_processing");
    expect(getSummary(fixtures.draftValid)).toContain("demographics");
    expect(getSummary(fixtures.draftValid)).toContain("no expiry");
    expect(getSummary(fixtures.draftWithExpiry)).toContain("expires 2030-01-01");
  });

  it("exposes enumerated CONSENT_TYPES and CONSENT_SCOPES for UI dropdowns", () => {
    expect(CONSENT_TYPES.length).toBeGreaterThanOrEqual(4);
    expect(CONSENT_SCOPES.length).toBeGreaterThanOrEqual(5);
  });
});
