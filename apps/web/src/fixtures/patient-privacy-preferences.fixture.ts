import type { WebConsentTestFixture } from '@qyou/shared';

export const mockWebPrivacyPreferencesFixture: WebConsentTestFixture = {
  fixtureId: 'priv_fix_web_001',
  preferences: {
    patientId: 'patient_601',
    analyticsSharing: true,
    marketingOptIn: false,
    medicalResearchOptIn: true,
  },
};
