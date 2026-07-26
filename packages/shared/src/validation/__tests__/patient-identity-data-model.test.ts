import { describe, it, expect } from 'vitest';
import { patientIdentityModelSchema, patientRecordHeaderSchema } from '../patient-identity-data-model.schemas';

describe('Patient Identity Data Model Schemas', () => {
  it('validates a valid patient identity model', () => {
    const validModel = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      nationalId: 'NAT-123456',
      fullName: 'John Doe',
      dateOfBirth: '1990-01-01',
      gender: 'male',
      bloodGroup: 'O+',
      emergencyContact: {
        name: 'Jane Doe',
        relationship: 'Spouse',
        phoneNumber: '+1234567890',
      },
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    expect(patientIdentityModelSchema.safeParse(validModel).success).toBe(true);
  });

  it('validates a valid patient record header', () => {
    const validHeader = {
      patientId: '123e4567-e89b-12d3-a456-426614174000',
      status: 'active',
      primaryClinicId: '987e6543-e89b-12d3-a456-426614174000',
    };
    expect(patientRecordHeaderSchema.safeParse(validHeader).success).toBe(true);
  });
});
