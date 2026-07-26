import type { PatientIdentityFixtureSeed } from '@qyou/shared';

export const mockMobilePatientIdentityFixture: PatientIdentityFixtureSeed = {
  seedId: 'identity_seed_mobile_001',
  records: [
    {
      patientId: 'patient_id_101',
      firstName: 'Ngozi',
      lastName: 'Adeyemi',
      dateOfBirth: '1993-06-10',
      gender: 'female',
      mrn: 'MRN-20260101',
      status: 'active',
      createdAt: '2026-03-12T08:00:00Z',
      updatedAt: '2026-07-22T11:00:00Z',
    },
    {
      patientId: 'patient_id_102',
      firstName: 'Emeka',
      lastName: 'Nwosu',
      dateOfBirth: '1980-01-28',
      gender: 'male',
      mrn: 'MRN-20260102',
      status: 'inactive',
      createdAt: '2026-04-01T09:30:00Z',
      updatedAt: '2026-07-10T15:20:00Z',
    },
    {
      patientId: 'patient_id_103',
      firstName: 'Aisha',
      lastName: 'Bello',
      dateOfBirth: '1975-09-14',
      gender: 'female',
      mrn: 'MRN-20260103',
      status: 'active',
      createdAt: '2026-05-20T14:00:00Z',
      updatedAt: '2026-07-24T10:45:00Z',
    },
  ],
};
