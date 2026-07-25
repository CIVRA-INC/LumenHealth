import type { ConsentFixtureSeed } from '@qyou/shared';

export const mockApiPatientConsentFixture: ConsentFixtureSeed = {
  seedId: 'consent_seed_api_002',
  consents: [
    {
      consentId: 'cns_201',
      patientId: 'patient_502',
      scope: 'data_sharing',
      status: 'granted',
      grantedAt: '2026-07-25T09:30:00Z',
      expiresAt: '2027-07-25T09:30:00Z',
    },
  ],
};
