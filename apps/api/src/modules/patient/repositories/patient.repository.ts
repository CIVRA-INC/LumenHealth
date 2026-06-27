import type {
  Patient,
  PatientStatus,
  PatientListItem,
  PatientListPage,
  PatientErrorCode,
} from "@lumen/types";

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

  /**
   * Case-insensitive partial search across `givenName` and `familyName`,
   * scoped to a single `clinicId`. Returns the sanitized `PatientListItem`
   * shape (no phone/email/address/birthDate). Capped at 50 results per
   * query.
   */
  findByClinicAndName(
    clinicId: string,
    query: string,
    limit: number = 50,
  ): PatientListItem[] {
    if (typeof query !== "string") return [];
    const q = query.trim().toLowerCase();
    if (q.length === 0) return [];
    const cap = Math.min(Math.max(limit, 1), 50);
    const out: PatientListItem[] = [];
    for (const p of store.values()) {
      if (p.clinicId !== clinicId) continue;
      const given = p.givenName.toLowerCase();
      const family = p.familyName.toLowerCase();
      if (given.includes(q) || family.includes(q)) {
        out.push({
          patientId: p.patientId,
          clinicId: p.clinicId,
          identifier: p.identifier,
          givenName: p.givenName,
          familyName: p.familyName,
          status: p.status,
        });
        if (out.length >= cap) break;
      }
    }
    return out;
  },

  /**
   * Paginated list of patients within a clinic, with simple offset/limit
   * pagination. Hard caps: `limit` 1..50 (default 25), `offset` ≥ 0.
   */
  listPaginated(
    clinicId: string,
    opts: { limit?: number; offset?: number } = {},
  ): PatientListPage {
    const limit = Math.min(Math.max(opts.limit ?? 25, 1), 50);
    const offset = Math.max(opts.offset ?? 0, 0);
    const all = Array.from(store.values()).filter(
      (p) => p.clinicId === clinicId,
    );
    const slice = all.slice(offset, offset + limit);
    return {
      items: slice.map((p) => ({
        patientId: p.patientId,
        clinicId: p.clinicId,
        identifier: p.identifier,
        givenName: p.givenName,
        familyName: p.familyName,
        status: p.status,
      })),
      total: all.length,
      limit,
      offset,
    };
  },

  /**
   * Strict save: write only when the (clinicId, identifier) pair is unused
   * by any *other* patient. Re-saving the same patient with the same
   * identifier is allowed (idempotent update). Differs from `save` which
   * silently overwrites the index.
   */
  saveStrict(
    patient: Patient,
  ):
    | { ok: true; patient: Patient }
    | { ok: false; error: PatientErrorCode; message: string } {
    const existingId = identifierIndex.get(
      indexKey(patient.clinicId, patient.identifier),
    );
    if (existingId && existingId !== patient.patientId) {
      return {
        ok: false,
        error: "PATIENT_IDENTIFIER_TAKEN",
        message:
          "this medical record number is already in use in this clinic",
      };
    }
    store.set(patient.patientId, patient);
    identifierIndex.set(
      indexKey(patient.clinicId, patient.identifier),
      patient.patientId,
    );
    return { ok: true, patient };
  },

  /**
   * Mark an existing patient as archived. Sets `status='archived'`, stamps
   * `archivedAt` with the current ISO timestamp, and bumps `updatedAt`.
   * Returns null when the patient does not exist.
   */
  archiveById(patientId: string): Patient | null {
    const p = store.get(patientId);
    if (!p) return null;
    const now = new Date().toISOString();
    const archived: Patient = {
      ...p,
      status: "archived",
      archivedAt: now,
      updatedAt: now,
    };
    store.set(patientId, archived);
    return archived;
  },

  _reset(): void {
    store.clear();
    identifierIndex.clear();
  },
};
