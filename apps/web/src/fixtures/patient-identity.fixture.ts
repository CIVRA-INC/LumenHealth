import type { PatientIdentityFixtureSeed } from '@qyou/shared';

export const mockWebPatientIdentityFixture: PatientIdentityFixtureSeed = {
  seedId: 'identity_seed_web_001',
  records: [
    {
      patientId: 'patient_id_001',
      firstName: 'Amina',
      lastName: 'Okafor',
      dateOfBirth: '1990-03-15',
      gender: 'female',
      mrn: 'MRN-20260001',
      status: 'active',
      createdAt: '2026-01-10T08:00:00Z',
      updatedAt: '2026-07-20T14:30:00Z',
    },
    {
      patientId: 'patient_id_002',
      firstName: 'Chukwu',
      lastName: 'Eze',
      dateOfBirth: '1985-07-22',
      gender: 'male',
      mrn: 'MRN-20260002',
      status: 'active',
      createdAt: '2026-02-05T10:15:00Z',
      updatedAt: '2026-07-18T09:45:00Z',
    },
    {
      patientId: 'patient_id_003',
      firstName: 'Fatima',
      lastName: 'Abubakar',
      dateOfBirth: '1978-11-03',
      gender: 'female',
      mrn: 'MRN-20260003',
      status: 'pending_verification',
      createdAt: '2026-06-01T12:00:00Z',
      updatedAt: '2026-07-25T16:00:00Z',
    },
  ],
};
