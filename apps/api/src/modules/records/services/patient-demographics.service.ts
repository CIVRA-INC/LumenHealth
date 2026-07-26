import { randomUUID } from "crypto";
import {
  patientDemographicRecordSchema,
  type PatientDemographicRecordInput,
} from "@qyou/shared";
import { patientStore } from "../repositories/in-memory-patient.repository.js";
import type {
  PatientRecord,
  CreatePatientInput,
  UpdateDemographicsInput,
} from "../types/patient-demographics.types.js";

export function createPatient(
  clinicId: string,
  input: CreatePatientInput,
): PatientRecord {
  const record: PatientDemographicRecordInput = {
    patientId: randomUUID(),
    firstName: input.firstName,
    lastName: input.lastName,
    dateOfBirth: input.dateOfBirth,
    gender: input.gender as PatientDemographicRecordInput["gender"],
    bloodType: input.bloodType,
    emergencyContact: input.emergencyContact,
  };

  patientDemographicRecordSchema.parse(record);

  const now = new Date().toISOString();
  const patient: PatientRecord = {
    ...record,
    clinicId,
    createdAt: now,
    updatedAt: now,
  };

  return patientStore.save(patient);
}

export function getPatient(
  patientId: string,
  clinicId: string,
): PatientRecord | null {
  const patient = patientStore.findById(patientId);
  if (!patient || patient.clinicId !== clinicId) {
    return null;
  }
  return patient;
}

export function updateDemographics(
  patientId: string,
  clinicId: string,
  input: UpdateDemographicsInput,
): PatientRecord | null {
  const existing = patientStore.findById(patientId);
  if (!existing || existing.clinicId !== clinicId) {
    return null;
  }

  const updated: PatientRecord = {
    ...existing,
    firstName: input.firstName ?? existing.firstName,
    lastName: input.lastName ?? existing.lastName,
    dateOfBirth: input.dateOfBirth ?? existing.dateOfBirth,
    gender: input.gender ?? existing.gender,
    bloodType: input.bloodType ?? existing.bloodType,
    emergencyContact: input.emergencyContact
      ? { ...existing.emergencyContact, ...input.emergencyContact }
      : existing.emergencyContact,
    updatedAt: new Date().toISOString(),
  };

  return patientStore.save(updated);
}

export function listPatients(clinicId: string): PatientRecord[] {
  return patientStore.listByClinic(clinicId);
}
