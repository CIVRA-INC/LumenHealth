export type KikeEncounterSection = "chiefComplaint" | "notes" | "plan";

export interface KikeEncounterDraft {
  patientId: string;
  clinicId: string;
  sections: Record<KikeEncounterSection, string>;
  updatedAtMs: number;
  idempotencyKey: string;
}

export interface KikeDraftStore {
  load(key: string): Promise<string | null>;
  save(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export function kikeDraftStorageKey(patientId: string, clinicId: string): string {
  return `encounter-draft:${clinicId}:${patientId}`;
}

export function createEmptyEncounterDraft(patientId: string, clinicId: string, nowMs = Date.now()): KikeEncounterDraft {
  return {
    patientId,
    clinicId,
    sections: { chiefComplaint: "", notes: "", plan: "" },
    updatedAtMs: nowMs,
    idempotencyKey: `enc-${clinicId}-${patientId}-${nowMs}`,
  };
}

export function mergeEncounterDraft(
  draft: KikeEncounterDraft,
  patch: Partial<Record<KikeEncounterSection, string>>,
  nowMs = Date.now(),
): KikeEncounterDraft {
  return {
    ...draft,
    sections: { ...draft.sections, ...patch },
    updatedAtMs: nowMs,
  };
}

export async function autosaveEncounterDraft(
  store: KikeDraftStore,
  draft: KikeEncounterDraft,
): Promise<void> {
  await store.save(kikeDraftStorageKey(draft.patientId, draft.clinicId), JSON.stringify(draft));
}

export async function loadEncounterDraft(
  store: KikeDraftStore,
  patientId: string,
  clinicId: string,
): Promise<KikeEncounterDraft | null> {
  const raw = await store.load(kikeDraftStorageKey(patientId, clinicId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as KikeEncounterDraft;
    if (!parsed || parsed.patientId !== patientId || parsed.clinicId !== clinicId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearEncounterDraftAfterSubmit(
  store: KikeDraftStore,
  patientId: string,
  clinicId: string,
): Promise<void> {
  await store.remove(kikeDraftStorageKey(patientId, clinicId));
}

export interface KikeEncounterSubmitPayload {
  patientId: string;
  clinicId: string;
  chiefComplaint: string;
  notes: string;
  plan: string;
  idempotencyKey: string;
}

export function validateEncounterDraft(draft: KikeEncounterDraft): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!draft.sections.chiefComplaint.trim()) errors.push("chiefComplaint is required");
  if (!draft.sections.notes.trim()) errors.push("notes is required");
  if (!draft.sections.plan.trim()) errors.push("plan is required");
  return { ok: errors.length === 0, errors };
}

export function toEncounterSubmitPayload(draft: KikeEncounterDraft): KikeEncounterSubmitPayload {
  return {
    patientId: draft.patientId,
    clinicId: draft.clinicId,
    chiefComplaint: draft.sections.chiefComplaint,
    notes: draft.sections.notes,
    plan: draft.sections.plan,
    idempotencyKey: draft.idempotencyKey,
  };
}
