import type { PatientDemographics } from "../types/patient-demographics.types.js";

type Listener = () => void;

let patients: PatientDemographics[] = [];
let activePatientId: string | null = null;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l());
}

export function getPatients(): PatientDemographics[] {
  return patients;
}

export function getActivePatientId(): string | null {
  return activePatientId;
}

export function getActivePatient(): PatientDemographics | null {
  return patients.find((p) => p.patientId === activePatientId) ?? null;
}

export function setPatients(list: PatientDemographics[]): void {
  patients = list;
  notify();
}

export function selectPatient(patientId: string): boolean {
  const target = patients.find((p) => p.patientId === patientId);
  if (!target) return false;
  activePatientId = patientId;
  notify();
  return true;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function _reset(): void {
  patients = [];
  activePatientId = null;
  listeners.clear();
}
