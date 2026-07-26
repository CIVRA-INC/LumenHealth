import type { PatientIdentity, GenderCategory } from '@lumen/types';

export const samplePatientIdentity: PatientIdentity = {
  patientId: 'patient_831_001',
  clinicId: 'clinic_831',
  firstName: 'Elena',
  lastName: 'Rodriguez',
  dateOfBirth: '1990-04-15',
  gender: 'female' as GenderCategory,
  mrn: 'MRN-20240001',
  phone: '+1-555-0131',
  email: 'elena.rodriguez@example.com',
  address: '742 Evergreen Terrace, Springfield, IL 62704',
  identityHash: 'sha256_identity_elena_001',
  createdAt: '2026-01-15T10:00:00.000Z',
  updatedAt: '2026-06-20T14:30:00.000Z',
};

export const emptyPatientIdentity = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: 'prefer_not_to_say' as GenderCategory,
  mrn: '',
  phone: '',
  email: '',
  address: '',
};
