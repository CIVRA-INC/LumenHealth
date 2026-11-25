import { z } from 'zod';
import { paginationQuerySchema, sortDirectionSchema } from './common';
import type { PatientSummary } from './patients';

export const ENCOUNTER_STATUSES = [
  'IN_PROGRESS',
  'FINALIZED',
  'CLOSED',
  'ENTERED_IN_ERROR',
] as const;
export const encounterStatusSchema = z.enum(ENCOUNTER_STATUSES);
export type EncounterStatus = z.infer<typeof encounterStatusSchema>;
export const ENCOUNTER_STATUS_LABELS: Record<EncounterStatus, string> = {
  IN_PROGRESS: 'In progress',
  FINALIZED: 'Signed',
  CLOSED: 'Closed',
  ENTERED_IN_ERROR: 'Entered in error',
};

/**
 * IN_PROGRESS      documentation is a draft and freely editable
 * FINALIZED        signed by the clinician; content is locked, only addenda may be added
 * CLOSED           visit concluded with a disposition
 * ENTERED_IN_ERROR voided while still a draft (e.g. wrong patient)
 */
export const ENCOUNTER_TRANSITIONS: Record<EncounterStatus, readonly EncounterStatus[]> = {
  IN_PROGRESS: ['FINALIZED', 'ENTERED_IN_ERROR'],
  FINALIZED: ['CLOSED'],
  CLOSED: [],
  ENTERED_IN_ERROR: [],
};

export function canTransitionEncounter(from: EncounterStatus, to: EncounterStatus): boolean {
  return ENCOUNTER_TRANSITIONS[from].includes(to);
}

export const DISPOSITIONS = [
  'DISCHARGED_HOME',
  'REFERRED',
  'ADMITTED',
  'LEFT_AGAINST_ADVICE',
] as const;
export const dispositionSchema = z.enum(DISPOSITIONS);
export type Disposition = z.infer<typeof dispositionSchema>;
export const DISPOSITION_LABELS: Record<Disposition, string> = {
  DISCHARGED_HOME: 'Discharged home',
  REFERRED: 'Referred',
  ADMITTED: 'Admitted',
  LEFT_AGAINST_ADVICE: 'Left against advice',
};

export const startEncounterSchema = z.object({
  appointmentId: z.uuid(),
  /** Safety check: the patient the clinician believes they are opening. */
  expectedPatientId: z.uuid(),
});
export type StartEncounterInput = z.infer<typeof startEncounterSchema>;

// ── Vitals ───────────────────────────────────────────────────────────────────

const optionalNumber = (min: number, max: number) => z.number().min(min).max(max).optional();

export const recordVitalsSchema = z
  .object({
    temperatureC: optionalNumber(30, 45),
    heartRate: z.number().int().min(20).max(300).optional(),
    respiratoryRate: z.number().int().min(4).max(80).optional(),
    systolicBp: z.number().int().min(50).max(300).optional(),
    diastolicBp: z.number().int().min(20).max(200).optional(),
    spo2: z.number().int().min(50).max(100).optional(),
    weightKg: optionalNumber(0.3, 500),
    heightCm: optionalNumber(20, 280),
    note: z.string().trim().max(500).optional(),
  })
  .refine(
    (v) =>
      [
        v.temperatureC,
        v.heartRate,
        v.respiratoryRate,
        v.systolicBp,
        v.diastolicBp,
        v.spo2,
        v.weightKg,
        v.heightCm,
      ].some((x) => x !== undefined),
    { message: 'Enter at least one measurement' },
  )
  .refine((v) => (v.systolicBp === undefined) === (v.diastolicBp === undefined), {
    message: 'Enter both systolic and diastolic pressure',
    path: ['diastolicBp'],
  })
  .refine(
    (v) =>
      v.systolicBp === undefined || v.diastolicBp === undefined || v.systolicBp > v.diastolicBp,
    {
      message: 'Systolic pressure must be higher than diastolic',
      path: ['systolicBp'],
    },
  );
export type RecordVitalsInput = z.infer<typeof recordVitalsSchema>;

export const voidEntrySchema = z.object({ reason: z.string().trim().min(3).max(300) });
export type VoidEntryInput = z.infer<typeof voidEntrySchema>;

export interface VitalsView {
  id: string;
  recordedAt: string;
  recordedBy: { userId: string; fullName: string };
  temperatureC: number | null;
  heartRate: number | null;
  respiratoryRate: number | null;
  systolicBp: number | null;
  diastolicBp: number | null;
  spo2: number | null;
  weightKg: number | null;
  heightCm: number | null;
  bmi: number | null;
  note: string | null;
  enteredInError: boolean;
}

export function computeBmi(weightKg?: number | null, heightCm?: number | null): number | null {
  if (!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

// ── Clinical note ────────────────────────────────────────────────────────────

const noteField = z.string().trim().max(10_000).nullable();
export const saveClinicalNoteSchema = z
  .object({
    chiefComplaint: noteField,
    history: noteField,
    examination: noteField,
    assessment: noteField,
    plan: noteField,
  })
  .partial();
export type SaveClinicalNoteInput = z.infer<typeof saveClinicalNoteSchema>;

export interface ClinicalNoteView {
  chiefComplaint: string | null;
  history: string | null;
  examination: string | null;
  assessment: string | null;
  plan: string | null;
  updatedAt: string;
  updatedBy: { userId: string; fullName: string };
}

// ── Diagnoses ────────────────────────────────────────────────────────────────

export const DIAGNOSIS_TYPES = ['PRIMARY', 'SECONDARY'] as const;
export const diagnosisTypeSchema = z.enum(DIAGNOSIS_TYPES);
export const DIAGNOSIS_CERTAINTIES = ['PROVISIONAL', 'CONFIRMED'] as const;
export const diagnosisCertaintySchema = z.enum(DIAGNOSIS_CERTAINTIES);

export const addDiagnosisSchema = z.object({
  description: z.string().trim().min(2).max(200),
  icd10Code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-TV-Z][0-9][0-9AB](\.[0-9A-TV-Z]{1,4})?$/, 'Enter a valid ICD-10 code, e.g. J02.9')
    .optional(),
  type: diagnosisTypeSchema.default('SECONDARY'),
  certainty: diagnosisCertaintySchema.default('PROVISIONAL'),
});
export type AddDiagnosisInput = z.input<typeof addDiagnosisSchema>;

export interface DiagnosisView {
  id: string;
  description: string;
  icd10Code: string | null;
  type: z.infer<typeof diagnosisTypeSchema>;
  certainty: z.infer<typeof diagnosisCertaintySchema>;
  recordedBy: { userId: string; fullName: string };
  recordedAt: string;
}

// ── Medication orders ────────────────────────────────────────────────────────

export const ROUTES = [
  'ORAL',
  'TOPICAL',
  'INTRAVENOUS',
  'INTRAMUSCULAR',
  'SUBCUTANEOUS',
  'INHALED',
  'OTHER',
] as const;
export const routeSchema = z.enum(ROUTES);
export const ROUTE_LABELS: Record<(typeof ROUTES)[number], string> = {
  ORAL: 'Oral',
  TOPICAL: 'Topical',
  INTRAVENOUS: 'Intravenous',
  INTRAMUSCULAR: 'Intramuscular',
  SUBCUTANEOUS: 'Subcutaneous',
  INHALED: 'Inhaled',
  OTHER: 'Other',
};

export const MEDICATION_ORDER_STATUSES = ['DRAFT', 'ACTIVE', 'CANCELLED'] as const;
export const medicationOrderStatusSchema = z.enum(MEDICATION_ORDER_STATUSES);

export const addMedicationOrderSchema = z.object({
  drugName: z.string().trim().min(2).max(120),
  strength: z.string().trim().max(60).optional(),
  form: z.string().trim().max(60).optional(),
  route: routeSchema.default('ORAL'),
  dose: z.string().trim().min(1, 'Required').max(80),
  frequency: z.string().trim().min(1, 'Required').max(80),
  durationDays: z.number().int().min(1).max(365).optional(),
  quantity: z.number().int().min(1).max(10_000).optional(),
  instructions: z.string().trim().max(500).optional(),
});
export type AddMedicationOrderInput = z.input<typeof addMedicationOrderSchema>;

export interface MedicationOrderView {
  id: string;
  drugName: string;
  strength: string | null;
  form: string | null;
  route: z.infer<typeof routeSchema>;
  dose: string;
  frequency: string;
  durationDays: number | null;
  quantity: number | null;
  instructions: string | null;
  status: z.infer<typeof medicationOrderStatusSchema>;
  cancelReason: string | null;
  prescribedBy: { userId: string; fullName: string };
  prescribedAt: string;
}

// ── Lifecycle actions ────────────────────────────────────────────────────────

export const finalizeEncounterSchema = z.object({
  /** Explicit acknowledgement that signing locks the documentation. */
  confirm: z.literal(true),
});
export type FinalizeEncounterInput = z.infer<typeof finalizeEncounterSchema>;

export const closeEncounterSchema = z.object({
  disposition: dispositionSchema,
  dischargeInstructions: z.string().trim().max(2_000).optional(),
});
export type CloseEncounterInput = z.infer<typeof closeEncounterSchema>;

export const voidEncounterSchema = z.object({ reason: z.string().trim().min(5).max(300) });
export type VoidEncounterInput = z.infer<typeof voidEncounterSchema>;

export const addAddendumSchema = z.object({ text: z.string().trim().min(3).max(5_000) });
export type AddAddendumInput = z.infer<typeof addAddendumSchema>;

export interface AddendumView {
  id: string;
  text: string;
  author: { userId: string; fullName: string };
  createdAt: string;
}

export interface EncounterView {
  id: string;
  status: EncounterStatus;
  startedAt: string;
  finalizedAt: string | null;
  closedAt: string | null;
  disposition: Disposition | null;
  dischargeInstructions: string | null;
  voidReason: string | null;
  appointmentId: string | null;
  patient: PatientSummary;
  attending: { userId: string; fullName: string };
  finalizedBy: { userId: string; fullName: string } | null;
  version: number;
  /** What the signed-in user may still change on this encounter. */
  editable: boolean;
}

export interface EncounterDetail extends EncounterView {
  note: ClinicalNoteView | null;
  vitals: VitalsView[];
  diagnoses: DiagnosisView[];
  medicationOrders: MedicationOrderView[];
  addenda: AddendumView[];
}

export interface EncounterListItem {
  id: string;
  status: EncounterStatus;
  startedAt: string;
  attending: { userId: string; fullName: string };
  primaryDiagnosis: string | null;
}

export const encounterListQuerySchema = paginationQuerySchema.extend({
  status: encounterStatusSchema.optional(),
  /** Only encounters where the signed-in user is the attending clinician. */
  mine: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  sort: z.enum(['startedAt']).default('startedAt'),
  order: sortDirectionSchema.default('desc'),
});
export type EncounterListQuery = z.infer<typeof encounterListQuerySchema>;
