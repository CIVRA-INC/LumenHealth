import { ConsentType, ConsentStatus } from './entities/consent.entity';

const CONSENT_FIXTURE = {
  id: 'consent-1', patientId: 'patient-1',
  consentType: ConsentType.TREATMENT,
  status: ConsentStatus.GRANTED,
  grantedAt: new Date('2026-06-01'),
  createdAt: new Date('2026-06-01'),
  updatedAt: new Date('2026-06-01'),
};

describe('Consent Integration Fixtures', () => {
  it('fixture has correct type', () => expect(CONSENT_FIXTURE.consentType).toBe(ConsentType.TREATMENT));
  it('fixture is granted', () => expect(CONSENT_FIXTURE.status).toBe(ConsentStatus.GRANTED));
  it('ConsentType covers expected values', () => {
    expect(Object.values(ConsentType)).toContain('treatment');
    expect(Object.values(ConsentType)).toContain('data_sharing');
    expect(Object.values(ConsentType)).toContain('research');
  });
  it('ConsentStatus covers expected values', () => {
    expect(Object.values(ConsentStatus)).toContain('granted');
    expect(Object.values(ConsentStatus)).toContain('revoked');
    expect(Object.values(ConsentStatus)).toContain('expired');
  });
  it('has 5 consent types', () => expect(Object.keys(ConsentType)).toHaveLength(5));
  it('has 4 consent statuses', () => expect(Object.keys(ConsentStatus)).toHaveLength(4));
});
