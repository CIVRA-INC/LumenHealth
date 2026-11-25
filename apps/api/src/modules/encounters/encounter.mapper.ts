import {
  computeBmi,
  type AddendumView,
  type ClinicalNoteView,
  type DiagnosisView,
  type EncounterDetail,
  type MedicationOrderView,
  type VitalsView,
} from '@lumen/contracts';
import type {
  Addendum,
  ClinicalNote,
  Diagnosis,
  Encounter,
  MedicationOrder,
  Patient,
  VitalSigns,
} from '../../generated/prisma/client';
import type { RequestContext } from '../../common/request-context';
import type { Tx } from '../../database/prisma.service';
import { toPatientSummary } from '../patients/patient.mapper';

export const encounterInclude = {
  patient: true,
  note: true,
  vitals: { orderBy: { recordedAt: 'desc' } },
  diagnoses: { orderBy: { createdAt: 'asc' } },
  medicationOrders: { orderBy: { createdAt: 'asc' } },
  addenda: { orderBy: { createdAt: 'asc' } },
} as const;

export type EncounterWithDetail = Encounter & {
  patient: Patient;
  note: ClinicalNote | null;
  vitals: VitalSigns[];
  diagnoses: Diagnosis[];
  medicationOrders: MedicationOrder[];
  addenda: Addendum[];
};

const num = (v: { toNumber(): number } | null): number | null => (v === null ? null : v.toNumber());

export async function userNames(
  tx: Tx,
  ids: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id): id is string => !!id))];
  if (!unique.length) return new Map();
  const users = await tx.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, fullName: true },
  });
  return new Map(users.map((u) => [u.id, u.fullName]));
}

export async function toEncounterDetail(
  tx: Tx,
  ctx: RequestContext,
  e: EncounterWithDetail,
): Promise<EncounterDetail> {
  const names = await userNames(tx, [
    e.attendingId,
    e.finalizedById,
    e.note?.updatedById,
    ...e.vitals.map((v) => v.recordedById),
    ...e.diagnoses.map((d) => d.recordedById),
    ...e.medicationOrders.map((m) => m.prescribedById),
    ...e.addenda.map((a) => a.authorId),
  ]);
  const who = (id: string) => ({ userId: id, fullName: names.get(id) ?? 'Unknown' });

  const note: ClinicalNoteView | null = e.note
    ? {
        chiefComplaint: e.note.chiefComplaint,
        history: e.note.history,
        examination: e.note.examination,
        assessment: e.note.assessment,
        plan: e.note.plan,
        updatedAt: e.note.updatedAt.toISOString(),
        updatedBy: who(e.note.updatedById),
      }
    : null;

  const vitals: VitalsView[] = e.vitals.map((v) => {
    const weightKg = num(v.weightKg);
    const heightCm = num(v.heightCm);
    return {
      id: v.id,
      recordedAt: v.recordedAt.toISOString(),
      recordedBy: who(v.recordedById),
      temperatureC: num(v.temperatureC),
      heartRate: v.heartRate,
      respiratoryRate: v.respiratoryRate,
      systolicBp: v.systolicBp,
      diastolicBp: v.diastolicBp,
      spo2: v.spo2,
      weightKg,
      heightCm,
      bmi: computeBmi(weightKg, heightCm),
      note: v.note,
      enteredInError: v.enteredInError,
    };
  });

  const diagnoses: DiagnosisView[] = e.diagnoses.map((d) => ({
    id: d.id,
    description: d.description,
    icd10Code: d.icd10Code,
    type: d.type,
    certainty: d.certainty,
    recordedBy: who(d.recordedById),
    recordedAt: d.createdAt.toISOString(),
  }));

  const medicationOrders: MedicationOrderView[] = e.medicationOrders.map((m) => ({
    id: m.id,
    drugName: m.drugName,
    strength: m.strength,
    form: m.form,
    route: m.route,
    dose: m.dose,
    frequency: m.frequency,
    durationDays: m.durationDays,
    quantity: m.quantity,
    instructions: m.instructions,
    status: m.status,
    cancelReason: m.cancelReason,
    prescribedBy: who(m.prescribedById),
    prescribedAt: m.createdAt.toISOString(),
  }));

  const addenda: AddendumView[] = e.addenda.map((a) => ({
    id: a.id,
    text: a.text,
    author: who(a.authorId),
    createdAt: a.createdAt.toISOString(),
  }));

  return {
    ...toEncounterView(e, names, ctx),
    note,
    vitals,
    diagnoses,
    medicationOrders,
    addenda,
  };
}

export function toEncounterView(
  e: Encounter & { patient: Patient },
  names: Map<string, string>,
  ctx: RequestContext,
) {
  const who = (id: string) => ({ userId: id, fullName: names.get(id) ?? 'Unknown' });
  return {
    id: e.id,
    status: e.status,
    startedAt: e.startedAt.toISOString(),
    finalizedAt: e.finalizedAt?.toISOString() ?? null,
    closedAt: e.closedAt?.toISOString() ?? null,
    disposition: e.disposition,
    dischargeInstructions: e.dischargeInstructions,
    voidReason: e.voidReason,
    appointmentId: e.appointmentId,
    patient: toPatientSummary(e.patient),
    attending: who(e.attendingId),
    finalizedBy: e.finalizedById ? who(e.finalizedById) : null,
    version: e.version,
    editable: e.status === 'IN_PROGRESS' && e.attendingId === ctx.userId,
  };
}
