export type PatientIdentityStatus = 'active' | 'inactive' | 'deceased' | 'pending_verification';

export type GenderCategory = 'male' | 'female' | 'non_binary' | 'other' | 'prefer_not_to_say';

export interface PatientIdentity {
  patientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: GenderCategory;
  mrn: string;
  status: PatientIdentityStatus;
  identityHash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePatientIdentityRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: GenderCategory;
  mrn: string;
  status?: PatientIdentityStatus;
}

export interface PatientIdentityResponse {
  success: boolean;
  patient: PatientIdentity;
}

export interface PatientIdentityFixtureSeed {
  seedId: string;
  records: PatientIdentity[];
}
