import type { GenderCategory } from './patient-demographics-fixtures.types';

export interface PatientIdentity {
  patientId: string;
  clinicId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: GenderCategory;
  mrn: string;
  phone: string;
  email: string;
  address: string;
  identityHash?: string;
  anchoredAt?: string;
  stellarTxHash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatientIdentityInput {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: GenderCategory;
  mrn: string;
  phone: string;
  email: string;
  address: string;
}

export interface PatientIdentityApiResponse {
  success: boolean;
  identity?: PatientIdentity;
  error?: string;
}

export interface PatientIdentityAnchoredResponse {
  success: boolean;
  identityHash?: string;
  stellarTxHash?: string;
  anchoredAt?: string;
  error?: string;
}

export interface PatientIdentityAnchorStatus {
  patientId: string;
  isAnchored: boolean;
  identityHash?: string;
  stellarTxHash?: string;
  anchoredAt?: string;
}
