export type GenderCategory = 'male' | 'female' | 'non_binary' | 'other' | 'prefer_not_to_say';

export interface InsuranceInfo {
  provider: string;
  policyNumber: string;
  groupNumber?: string;
  subscriberName?: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phoneNumber: string;
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
  emergencyContact: EmergencyContact;
  insuranceInfo: InsuranceInfo;
  medicalRecordNumber: string;
  clinicId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatientListResponse {
  patients: PatientDemographics[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
