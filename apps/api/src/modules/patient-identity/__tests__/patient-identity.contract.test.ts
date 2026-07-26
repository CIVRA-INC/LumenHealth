import { describe, it, expect } from 'vitest';
import { PatientIdentityController } from '../patient-identity.controller';

describe('PatientIdentityController API Contract', () => {
  it('returns valid response matching PatientIdentityContractResponse shape', async () => {
    const controller = new PatientIdentityController();
    const res = await controller.getPatientIdentity('pat_123');

    expect(res.id).toBe('pat_123');
    expect(res.nationalId).toBeDefined();
    expect(res.fullName).toBeDefined();
    expect(res.verified).toBe(true);
  });
});
