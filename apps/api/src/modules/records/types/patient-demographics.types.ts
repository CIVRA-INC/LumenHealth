import type { GenderCategory } from '@qyou/shared';

export interface InsuranceInfo {
  provider: string;
  policyNumber: string;
  groupNumber?: string;
  subscriberName?: string;
}

export interface PatientDemographics {
  patientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: GenderCategory;
  bloodType?: string;
  phone: string;
  email: string;
  address: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phoneNumber: string;
  };
  insuranceInfo: InsuranceInfo;
  medicalRecordNumber: string;
  clinicId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePatientRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: GenderCategory;
  bloodType?: string;
  phone: string;
  email: string;
  address: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phoneNumber: string;
  };
  insuranceInfo: InsuranceInfo;
  clinicId: string;
}

export interface UpdatePatientRequest {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: GenderCategory;
  bloodType?: string;
  phone?: string;
  email?: string;
  address?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phoneNumber: string;
  };
  insuranceInfo?: InsuranceInfo;
}

export interface PatientListResponse {
  patients: PatientDemographics[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
