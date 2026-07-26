export type GenderCategory = 'male' | 'female' | 'non_binary' | 'other' | 'prefer_not_to_say';

export interface EmergencyContact {
  name: string;
  relationship: string;
  phoneNumber: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface PatientDemographics {
  patientId: string;
  clinicId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: GenderCategory;
  bloodType?: string;
  phone?: string;
  email?: string;
  address?: Address;
  emergencyContact: EmergencyContact;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreatePatientRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: GenderCategory;
  bloodType?: string;
  phone?: string;
  email?: string;
  address?: Address;
  emergencyContact: EmergencyContact;
}

export interface UpdatePatientRequest {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: GenderCategory;
  bloodType?: string;
  phone?: string;
  email?: string;
  address?: Address;
  emergencyContact?: EmergencyContact;
}

export interface PatientListQuery {
  search?: string;
  gender?: GenderCategory;
  page?: number;
  limit?: number;
}

export interface PatientDemographicsResponse {
  success: boolean;
  data?: PatientDemographics | PatientDemographics[];
  error?: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}
