import type { PatientRecord } from "../types/patient-demographics.types.js";

const store = new Map<string, PatientRecord>();

function save(patient: PatientRecord): PatientRecord {
  store.set(patient.patientId, patient);
  return patient;
}

function findById(patientId: string): PatientRecord | undefined {
  return store.get(patientId);
}

function listByClinic(clinicId: string): PatientRecord[] {
  const results: PatientRecord[] = [];
  for (const p of store.values()) {
    if (p.clinicId === clinicId) {
      results.push(p);
    }
  }
  return results;
}

function _reset(): void {
  store.clear();
}

export const patientStore = { save, findById, listByClinic, _reset };
