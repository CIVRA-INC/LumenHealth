import type { PatientDemographicRecord } from "./patient-demographics-fixtures.types.js";

export interface PatientListApiResponse {
  patients: PatientDemographicRecord[];
  totalCount: number;
}

export interface PatientDemographicsEnvelope {
  success: boolean;
  data?: PatientDemographicRecord;
  error?: string;
}

export interface PatientListEnvelope {
  success: boolean;
  data?: PatientListApiResponse;
  error?: string;
}

export interface CreatePatientRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "male" | "female" | "non_binary" | "other" | "prefer_not_to_say";
  bloodType?: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phoneNumber: string;
  };
}

export interface UpdatePatientDemographicsRequest {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "non_binary" | "other" | "prefer_not_to_say";
  bloodType?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phoneNumber: string;
  };
}
