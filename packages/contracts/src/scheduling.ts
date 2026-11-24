import { z } from 'zod';
import { instantSchema, paginationQuerySchema } from './common';
import type { PatientSummary } from './patients';

export const APPOINTMENT_TYPES = ['SCHEDULED', 'WALK_IN'] as const;
export const appointmentTypeSchema = z.enum(APPOINTMENT_TYPES);
export type AppointmentType = z.infer<typeof appointmentTypeSchema>;

export const APPOINTMENT_STATUSES = [
  'SCHEDULED',
  'CHECKED_IN',
  'IN_CONSULTATION',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
] as const;
export const appointmentStatusSchema = z.enum(APPOINTMENT_STATUSES);
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED: 'Scheduled',
  CHECKED_IN: 'Waiting',
  IN_CONSULTATION: 'In consultation',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No-show',
};

export const APPOINTMENT_OUTCOMES = [
  'SEEN',
  'NO_SHOW',
  'CANCELLED_BY_PATIENT',
  'CANCELLED_BY_CLINIC',
  'LEFT_WITHOUT_BEING_SEEN',
] as const;
export const appointmentOutcomeSchema = z.enum(APPOINTMENT_OUTCOMES);
export type AppointmentOutcome = z.infer<typeof appointmentOutcomeSchema>;
export const APPOINTMENT_OUTCOME_LABELS: Record<AppointmentOutcome, string> = {
  SEEN: 'Seen',
  NO_SHOW: 'Did not attend',
  CANCELLED_BY_PATIENT: 'Cancelled by patient',
  CANCELLED_BY_CLINIC: 'Cancelled by clinic',
  LEFT_WITHOUT_BEING_SEEN: 'Left without being seen',
};

export const PRIORITIES = ['ROUTINE', 'URGENT'] as const;
export const prioritySchema = z.enum(PRIORITIES);
export type Priority = z.infer<typeof prioritySchema>;

/**
 * Allowed appointment status transitions. The API enforces these; the UI uses
 * the same table to decide which actions to offer.
 */
export const APPOINTMENT_TRANSITIONS: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  SCHEDULED: ['CHECKED_IN', 'CANCELLED', 'NO_SHOW'],
  CHECKED_IN: ['IN_CONSULTATION', 'CANCELLED'],
  IN_CONSULTATION: ['COMPLETED', 'CHECKED_IN'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export function canTransitionAppointment(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return APPOINTMENT_TRANSITIONS[from].includes(to);
}

export const createAppointmentSchema = z.object({
  patientId: z.uuid(),
  departmentId: z.uuid().optional(),
  /** Assigned clinician (user id). Optional: unassigned appointments go to the general queue. */
  clinicianId: z.uuid().optional(),
  scheduledStart: instantSchema,
  durationMinutes: z.number().int().min(5).max(240).default(20),
  reason: z.string().trim().max(500).optional(),
  priority: prioritySchema.default('ROUTINE'),
});
export type CreateAppointmentInput = z.input<typeof createAppointmentSchema>;

export const createWalkInSchema = z.object({
  patientId: z.uuid(),
  departmentId: z.uuid().optional(),
  reason: z.string().trim().min(2, 'Add a short reason for the visit').max(500),
  priority: prioritySchema.default('ROUTINE'),
});
export type CreateWalkInInput = z.input<typeof createWalkInSchema>;

export const cancelAppointmentSchema = z.object({
  outcome: z.enum(['CANCELLED_BY_PATIENT', 'CANCELLED_BY_CLINIC', 'LEFT_WITHOUT_BEING_SEEN']),
  note: z.string().trim().max(500).optional(),
});
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;

export const listAppointmentsQuerySchema = paginationQuerySchema.extend({
  /** Local calendar day in the organisation's time zone (YYYY-MM-DD). Defaults to today. */
  date: z.iso.date().optional(),
  status: appointmentStatusSchema.optional(),
  patientId: z.uuid().optional(),
});
export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>;

export interface AppointmentView {
  id: string;
  type: AppointmentType;
  status: AppointmentStatus;
  priority: Priority;
  outcome: AppointmentOutcome | null;
  scheduledStart: string;
  scheduledEnd: string;
  reason: string | null;
  ticketNumber: number | null;
  checkedInAt: string | null;
  patient: PatientSummary;
  clinician: { userId: string; fullName: string } | null;
  department: { id: string; name: string } | null;
  encounterId: string | null;
}

export interface QueueView {
  waiting: AppointmentView[];
  inConsultation: AppointmentView[];
}
