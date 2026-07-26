import {
  createPatientRequestSchema,
  updatePatientDemographicsRequestSchema,
  type PatientDemographicRecord,
  type CreatePatientRequestInput,
  type UpdatePatientDemographicsRequestInput,
} from "@qyou/shared";
import { patientStore, type PatientRecord } from "../repositories/in-memory-patient.repository.js";

export class PatientDemographicsService {
  public getDemographics(patientId: string): PatientRecord | undefined {
    return patientStore.findById(patientId);
  }

  public listPatients(clinicId: string): PatientRecord[] {
    return patientStore.findByClinic(clinicId);
  }

  public createPatient(
    clinicId: string,
    input: CreatePatientRequestInput,
  ): PatientRecord {
    const parsed = createPatientRequestSchema.parse(input);
    return patientStore.create(clinicId, parsed);
  }

  public updateDemographics(
    patientId: string,
    clinicId: string,
    input: UpdatePatientDemographicsRequestInput,
  ): PatientRecord | undefined {
    const parsed = updatePatientDemographicsRequestSchema.parse(input);
    const existing = patientStore.findById(patientId);
    if (!existing || existing.clinicId !== clinicId) return undefined;
    return patientStore.update(patientId, parsed);
  }
}

export const patientDemographicsService = new PatientDemographicsService();
