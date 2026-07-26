import { describe, it, expect } from 'vitest';
import { PatientIdentityService } from '../patient-identity.service';

describe('PatientIdentityService', () => {
  it('registers a patient identity successfully', async () => {
    const service = new PatientIdentityService();
    const result = await service.registerPatient({
      nationalId: 'NAT-999888',
      fullName: 'Alice Smith',
      dateOfBirth: '1995-05-15',
      gender: 'female',
      emergencyContact: {
        name: 'Bob Smith',
        relationship: 'Brother',
        phoneNumber: '+1987654321',
      },
    });

    expect(result.success).toBe(true);
    expect(result.patientId).toBeDefined();
    expect(result.status).toBe('active');
  });

  it('retrieves patient by ID', async () => {
    const service = new PatientIdentityService();
    const res = await service.getPatientById('pat_100');
    expect(res.id).toBe('pat_100');
    expect(res.status).toBe('active');
  });
});
