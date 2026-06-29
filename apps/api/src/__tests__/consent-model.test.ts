import { createConsentRecord, validateConsent, createPrivacyPreference, fixtures } from "../consent/model";

describe("Consent & Privacy Data Model", () => {
  describe("validateConsent", () => {
    it("accepts valid consent", () => {
      expect(validateConsent(fixtures.validConsent)).toEqual([]);
    });

    it("rejects invalid consent", () => {
      const errors = validateConsent(fixtures.invalidConsent);
      expect(errors).toContain("Valid consentType is required");
      expect(errors).toContain("scope is required");
    });
  });

  describe("createConsentRecord", () => {
    it("creates a granted consent record", () => {
      const record = createConsentRecord(fixtures.patientId, fixtures.clinicId, fixtures.validConsent);
      expect(record.status).toBe("granted");
      expect(record.consentType).toBe("data-sharing");
      expect(record.patientId).toBe("pat_cns_01");
      expect(record.id).toMatch(/^cns_/);
    });

    it("sets null for missing expiresAt", () => {
      const record = createConsentRecord(fixtures.patientId, fixtures.clinicId, { consentType: "research", scope: "anonymized data only" });
      expect(record.expiresAt).toBeNull();
    });
  });

  describe("createPrivacyPreference", () => {
    it("creates defaults", () => {
      const pref = createPrivacyPreference("pat_privacy_01");
      expect(pref.shareWithProvider).toBe(true);
      expect(pref.shareForResearch).toBe(false);
      expect(pref.dataRetentionDays).toBe(365);
    });
  });
});
