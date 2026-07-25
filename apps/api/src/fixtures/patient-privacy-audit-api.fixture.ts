import type { WebConsentTestFixture } from '@qyou/shared';

export const mockApiPrivacyAuditFixture: WebConsentTestFixture = {
  fixtureId: 'priv_fix_api_002',
  preferences: {
    patientId: 'patient_602',
    analyticsSharing: false,
    marketingOptIn: false,
    medicalResearchOptIn: false,
  },
};
