import {
  APPOINTMENT_STATUS_LABELS,
  ENCOUNTER_STATUS_LABELS,
  type AppointmentStatus,
  type EncounterStatus,
  type Priority,
} from '@lumen/contracts';
import { StatusIndicator, Tag, type Tone } from '@lumen/ui';

const APPOINTMENT_TONES: Record<AppointmentStatus, Tone> = {
  SCHEDULED: 'neutral',
  CHECKED_IN: 'warning',
  IN_CONSULTATION: 'info',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
  NO_SHOW: 'danger',
};

const ENCOUNTER_TONES: Record<EncounterStatus, Tone> = {
  IN_PROGRESS: 'info',
  FINALIZED: 'success',
  CLOSED: 'neutral',
  ENTERED_IN_ERROR: 'danger',
};

/** Plain-language workflow labels for staff. */
const APPOINTMENT_LABEL: Record<AppointmentStatus, string> = {
  ...APPOINTMENT_STATUS_LABELS,
  SCHEDULED: 'Expected',
  CHECKED_IN: 'Waiting',
  IN_CONSULTATION: 'With clinician',
  COMPLETED: 'Seen',
};

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <StatusIndicator tone={APPOINTMENT_TONES[status]} pending={status === 'SCHEDULED'}>
      {APPOINTMENT_LABEL[status]}
    </StatusIndicator>
  );
}

export function EncounterStatusBadge({ status }: { status: EncounterStatus }) {
  return (
    <StatusIndicator tone={ENCOUNTER_TONES[status]}>
      {ENCOUNTER_STATUS_LABELS[status]}
    </StatusIndicator>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return priority === 'URGENT' ? <Tag tone="danger">Urgent</Tag> : null;
}
