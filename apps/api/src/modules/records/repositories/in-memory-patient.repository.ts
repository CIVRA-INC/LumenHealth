import { randomUUID } from "node:crypto";
import type { PatientDemographicRecord } from "@qyou/shared";

export type PatientRecord = PatientDemographicRecord & {
  clinicId: string;
  createdAt: string;
  updatedAt: string;
};

class InMemoryPatientRepository {
  private readonly store = new Map<string, PatientRecord>();

  public findById(patientId: string): PatientRecord | undefined {
    return this.store.get(patientId);
  }

  public findByClinic(clinicId: string): PatientRecord[] {
    const results: PatientRecord[] = [];
    for (const record of this.store.values()) {
      if (record.clinicId === clinicId) {
        results.push(record);
      }
    }
    return results;
  }

  public create(
    clinicId: string,
    data: Omit<PatientDemographicRecord, "patientId">,
  ): PatientRecord {
    const patientId = randomUUID();
    const now = new Date().toISOString();
    const record: PatientRecord = {
      ...data,
      patientId,
      clinicId,
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(patientId, record);
    return record;
  }

  public update(
    patientId: string,
    patch: Partial<PatientDemographicRecord>,
  ): PatientRecord | undefined {
    const existing = this.store.get(patientId);
    if (!existing) return undefined;
    const updated: PatientRecord = {
      ...existing,
      ...patch,
      patientId: existing.patientId,
      clinicId: existing.clinicId,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    this.store.set(patientId, updated);
    return updated;
  }

  public _reset(): void {
    this.store.clear();
  }
}

export const patientStore = new InMemoryPatientRepository();
