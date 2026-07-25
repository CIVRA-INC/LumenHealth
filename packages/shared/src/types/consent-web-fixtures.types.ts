export interface MockPrivacyPreferencePayload {
  patientId: string;
  analyticsSharing: boolean;
  marketingOptIn: boolean;
  medicalResearchOptIn: boolean;
}

export interface WebConsentTestFixture {
  fixtureId: string;
  preferences: MockPrivacyPreferencePayload;
}

export interface ConsentAssertionResult {
  passed: boolean;
  missingScopes: string[];
}
