import { randomUUID } from "crypto";
import type { ConsentRecord, ConsentStatus } from "@lumen/types";

const consentStore = new Map<string, ConsentRecord>();

export function _reset(): void {
  consentStore.clear();
}

export function save(record: ConsentRecord): ConsentRecord {
  consentStore.set(record.id, record);
  return record;
}

export function findById(id: string): ConsentRecord | undefined {
  return consentStore.get(id);
}

export function listByPatient(patientId: string): ConsentRecord[] {
  return Array.from(consentStore.values()).filter(
    (r) => r.patientId === patientId,
  );
}

export function remove(id: string): void {
  consentStore.delete(id);
}
