import type { Patient, PatientStatus } from "@lumen/types";

const store = new Map<string, Patient>();
const identifierIndex = new Map<string, string>(); // `${clinicId}:${identifier.toLowerCase()}` -> patientId

function indexKey(clinicId: string, identifier: string): string {
  return `${clinicId}:${identifier.toLowerCase()}`;
}

export const patientStore = {
  save(patient: Patient): Patient {
    store.set(patient.patientId, patient);
    identifierIndex.set(
      indexKey(patient.clinicId, patient.identifier),
      patient.patientId,
    );
    return patient;
  },

  findById(patientId: string): Patient | undefined {
    return store.get(patientId);
  },

  findByIdentifier(
    clinicId: string,
    identifier: string,
  ): Patient | undefined {
    const id = identifierIndex.get(indexKey(clinicId, identifier));
    return id ? store.get(id) : undefined;
  },

  list(filter?: {
    clinicId?: string;
    status?: PatientStatus;
  }): Patient[] {
    const all = Array.from(store.values());
    return all.filter((p) => {
      if (filter?.clinicId && p.clinicId !== filter.clinicId) return false;
      if (filter?.status && p.status !== filter.status) return false;
      return true;
    });
  },

  _reset(): void {
    store.clear();
    identifierIndex.clear();
  },
};
