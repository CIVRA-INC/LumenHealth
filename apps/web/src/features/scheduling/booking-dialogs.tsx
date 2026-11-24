import type {
  AppointmentView,
  ClinicianView,
  DepartmentView,
  PatientSummary,
} from '@lumen/contracts';
import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  FormField,
  TextField,
  Select,
  TextArea,
  toast,
} from '@lumen/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiError, api } from '../../lib/api';
import { errorMessage } from '../../lib/errors';
import { nowInZoneForInput, zonedInputToIso } from '../../lib/format';
import { useCan, useRequiredSession } from '../../lib/session';
import { useRefreshOperations } from './hooks';
import { PatientPicker } from './patient-picker';

function useDepartments(enabled: boolean) {
  const session = useRequiredSession();
  return useQuery({
    queryKey: ['departments', session.branch.id],
    queryFn: () => api.get<DepartmentView[]>('/departments'),
    enabled,
    staleTime: 5 * 60_000,
  });
}

function nextQuarterHour(timeZone: string): string {
  const base = nowInZoneForInput(timeZone, 15);
  const [date, time] = base.split('T') as [string, string];
  const [h, m] = time.split(':').map(Number) as [number, number];
  const rounded = Math.ceil(m / 15) * 15;
  const hh = rounded === 60 ? (h + 1) % 24 : h;
  return `${date}T${String(hh).padStart(2, '0')}:${String(rounded % 60).padStart(2, '0')}`;
}

interface BaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When known (e.g. from the patient's page) the patient is fixed. */
  patient?: PatientSummary;
}

/** The form mounts only while open, so every opening starts from clean state. */
export function BookAppointmentDialog(props: BaseProps) {
  return props.open ? <BookAppointmentForm {...props} /> : null;
}

export function WalkInDialog(props: BaseProps) {
  return props.open ? <WalkInForm {...props} /> : null;
}

function BookAppointmentForm({ open, onOpenChange, patient: fixed }: BaseProps) {
  const session = useRequiredSession();
  const tz = session.organization.timezone;
  const refresh = useRefreshOperations();
  const departments = useDepartments(open);
  const clinicians = useQuery({
    queryKey: ['clinicians', session.branch.id],
    queryFn: () => api.get<ClinicianView[]>('/clinicians'),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const [patient, setPatient] = useState<PatientSummary | null>(fixed ?? null);
  const [when, setWhen] = useState(() => nextQuarterHour(tz));
  const [duration, setDuration] = useState('20');
  const [clinicianId, setClinicianId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [reason, setReason] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const book = useMutation({
    mutationFn: () =>
      api.post<AppointmentView>('/appointments', {
        patientId: patient?.id,
        scheduledStart: zonedInputToIso(when, tz),
        durationMinutes: Number(duration),
        clinicianId: clinicianId || undefined,
        departmentId: departmentId || undefined,
        reason: reason || undefined,
        priority: urgent ? 'URGENT' : 'ROUTINE',
      }),
    onSuccess: (appt) => {
      toast.success('Appointment booked', { description: `${appt.patient.displayName}` });
      void refresh();
      onOpenChange(false);
      setReason('');
    },
    onError: (error) => setFieldErrors(error instanceof ApiError ? error.fieldErrors : {}),
  });

  const submit = () => {
    if (!patient) {
      setFieldErrors({ patientId: 'Choose a patient' });
      return;
    }
    if (!when) {
      setFieldErrors({ scheduledStart: 'Choose a date and time' });
      return;
    }
    setFieldErrors({});
    book.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Book appointment"
        description={`Times are in ${tz.replace('_', ' ')}.`}
        footer={
          <>
            <Button onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button variant="primary" loading={book.isPending} onClick={submit}>
              Book appointment
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {book.isError && !Object.keys(fieldErrors).length && (
            <Alert tone="danger">{errorMessage(book.error)}</Alert>
          )}
          {book.isError && book.error instanceof ApiError && book.error.status === 409 && (
            <Alert tone="warning" title="That time isn’t available">
              {book.error.message}
            </Alert>
          )}
          <FormField label="Patient" required error={fieldErrors.patientId}>
            <PatientPicker
              value={patient}
              onChange={fixed ? () => undefined : setPatient}
              invalid={!!fieldErrors.patientId}
            />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Date and time" required error={fieldErrors.scheduledStart}>
              <TextField
                type="datetime-local"
                value={when}
                min={nowInZoneForInput(tz)}
                onChange={(e) => setWhen(e.target.value)}
              />
            </FormField>
            <FormField label="Length">
              <Select value={duration} onChange={(e) => setDuration(e.target.value)}>
                {[10, 15, 20, 30, 45, 60].map((m) => (
                  <option key={m} value={m}>
                    {m} minutes
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Clinician" optional>
              <Select value={clinicianId} onChange={(e) => setClinicianId(e.target.value)}>
                <option value="">Any available clinician</option>
                {clinicians.data?.map((c) => (
                  <option key={c.userId} value={c.userId}>
                    {c.fullName}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Department" optional>
              <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">None</option>
                {departments.data?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <FormField label="Reason for visit" optional>
            <TextArea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
            />
          </FormField>
          <label className="flex items-center gap-2 text-sm text-ink-800">
            <input
              type="checkbox"
              className="size-4 accent-green-700"
              checked={urgent}
              onChange={(e) => setUrgent(e.target.checked)}
            />
            Mark as urgent
          </label>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WalkInForm({ open, onOpenChange, patient: fixed }: BaseProps) {
  const refresh = useRefreshOperations();
  const canCheckIn = useCan('queue.manage');
  const departments = useDepartments(open);
  const [patient, setPatient] = useState<PatientSummary | null>(fixed ?? null);
  const [reason, setReason] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const walkIn = useMutation({
    mutationFn: () =>
      api.post<AppointmentView>('/queue/walk-ins', {
        patientId: patient?.id,
        reason,
        departmentId: departmentId || undefined,
        priority: urgent ? 'URGENT' : 'ROUTINE',
      }),
    onSuccess: (appt) => {
      toast.success(`${appt.patient.displayName} added to the queue`, {
        description: `Queue number ${appt.ticketNumber}`,
      });
      void refresh();
      onOpenChange(false);
      setReason('');
      setUrgent(false);
    },
    onError: (error) => setFieldErrors(error instanceof ApiError ? error.fieldErrors : {}),
  });

  if (!canCheckIn) return null;

  const submit = () => {
    const errors: Record<string, string> = {};
    if (!patient) errors.patientId = 'Choose a patient';
    if (reason.trim().length < 2) errors.reason = 'Add a short reason for the visit';
    setFieldErrors(errors);
    if (Object.keys(errors).length === 0) walkIn.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Add walk-in to queue"
        description="The patient is checked in immediately and given a queue number."
        footer={
          <>
            <Button onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button variant="primary" loading={walkIn.isPending} onClick={submit}>
              Add to queue
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {walkIn.isError && !Object.keys(fieldErrors).length && (
            <Alert tone="warning">{errorMessage(walkIn.error)}</Alert>
          )}
          <FormField label="Patient" required error={fieldErrors.patientId}>
            <PatientPicker
              value={patient}
              onChange={fixed ? () => undefined : setPatient}
              invalid={!!fieldErrors.patientId}
            />
          </FormField>
          <FormField label="Reason for visit" required error={fieldErrors.reason}>
            <TextArea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
            />
          </FormField>
          <FormField label="Department" optional>
            <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">None</option>
              {departments.data?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </FormField>
          <label className="flex items-center gap-2 text-sm text-ink-800">
            <input
              type="checkbox"
              className="size-4 accent-green-700"
              checked={urgent}
              onChange={(e) => setUrgent(e.target.checked)}
            />
            Urgent: move ahead of routine patients
          </label>
        </div>
      </DialogContent>
    </Dialog>
  );
}
