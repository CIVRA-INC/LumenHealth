import type { AppointmentView } from './scheduling';

export interface DashboardView {
  /** The organisation-local calendar day all figures refer to (YYYY-MM-DD). */
  date: string;
  timezone: string;
  branch: { id: string; name: string };
  counts: {
    appointmentsToday: number;
    waiting: number;
    inConsultation: number;
    completedToday: number;
  };
  /** Longest-waiting patients first. */
  queue: AppointmentView[];
  /** Appointments still to arrive today. */
  upcoming: AppointmentView[];
  /** Median minutes from check-in to start of consultation, for patients seen today. Null if none. */
  medianWaitMinutes: number | null;
}
