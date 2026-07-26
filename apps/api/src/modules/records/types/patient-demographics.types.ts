import type { PatientDemographicRecord } from "@qyou/shared";

export type PatientRecord = {
  patientId: string;
  clinicId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  bloodType?: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phoneNumber: string;
  };
  lastVisitAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreatePatientInput = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  bloodType?: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phoneNumber: string;
  };
};

export type UpdateDemographicsInput = Partial<Omit<CreatePatientInput, "emergencyContact"> & {
  emergencyContact?: Partial<CreatePatientInput["emergencyContact"]>;
}>;
