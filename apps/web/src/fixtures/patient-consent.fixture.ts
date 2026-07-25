import type { ConsentFixtureSeed } from '@qyou/shared';

export const mockWebPatientConsentFixture: ConsentFixtureSeed = {
  seedId: 'consent_seed_web_001',
  consents: [
    {
      consentId: 'cns_101',
      patientId: 'patient_501',
      scope: 'medical_history',
      status: 'granted',
      grantedAt: '2026-07-25T08:00:00Z',
    },
    {
      consentId: 'cns_102',
      patientId: 'patient_501',
      scope: 'marketing',
      status: 'revoked',
    },
  ],
};
