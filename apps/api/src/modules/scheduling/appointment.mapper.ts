import type { AppointmentView } from '@lumen/contracts';
import type { Appointment, Department, Patient } from '../../generated/prisma/client';
import type { Tx } from '../../database/prisma.service';
import { toPatientSummary } from '../patients/patient.mapper';

export const appointmentInclude = {
  patient: true,
  department: true,
  encounter: { select: { id: true } },
} as const;

type AppointmentRow = Appointment & {
  patient: Patient;
  department: Department | null;
  encounter: { id: string } | null;
};

/** Converts rows to API views, resolving clinician names in one query. */
export async function toAppointmentViews(
  tx: Tx,
  rows: AppointmentRow[],
): Promise<AppointmentView[]> {
  const clinicianIds = [
    ...new Set(rows.map((r) => r.clinicianId).filter((id): id is string => !!id)),
  ];
  const users = clinicianIds.length
    ? await tx.user.findMany({
        where: { id: { in: clinicianIds } },
        select: { id: true, fullName: true },
      })
    : [];
  const names = new Map(users.map((u) => [u.id, u.fullName]));
  return rows.map((a) => ({
    id: a.id,
    type: a.type,
    status: a.status,
    priority: a.priority,
    outcome: a.outcome,
    scheduledStart: a.scheduledStart.toISOString(),
    scheduledEnd: a.scheduledEnd.toISOString(),
    reason: a.reason,
    ticketNumber: a.ticketNumber,
    checkedInAt: a.checkedInAt?.toISOString() ?? null,
    patient: toPatientSummary(a.patient),
    clinician: a.clinicianId
      ? { userId: a.clinicianId, fullName: names.get(a.clinicianId) ?? 'Unknown' }
      : null,
    department: a.department ? { id: a.department.id, name: a.department.name } : null,
    encounterId: a.encounter?.id ?? null,
  }));
}
