import type { AuthSession } from "@lumen/types";

export type ClinicOption = {
  clinicId: string;
  name: string;
  role: AuthSession["role"];
};

type Listener = () => void;

let clinics: ClinicOption[] = [];
let activeClinicId: string | null = null;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l());
}

export function getClinics(): ClinicOption[] {
  return clinics;
}

export function getActiveClinicId(): string | null {
  return activeClinicId;
}

export function getActiveClinic(): ClinicOption | null {
  return clinics.find((c) => c.clinicId === activeClinicId) ?? null;
}

export function setClinics(list: ClinicOption[]): void {
  clinics = list;
  if (list.length > 0 && !activeClinicId) {
    activeClinicId = list[0].clinicId;
  }
  notify();
}

export function switchClinic(clinicId: string): boolean {
  const target = clinics.find((c) => c.clinicId === clinicId);
  if (!target) return false;
  activeClinicId = clinicId;
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
  clinics = [];
  activeClinicId = null;
  listeners.clear();
}
