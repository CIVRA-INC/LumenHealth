import {
  APPOINTMENT_OUTCOME_LABELS,
  canTransitionAppointment,
  type AppointmentView,
} from '@lumen/contracts';
import {
  Button,
  Dialog,
  DialogContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  FormField,
  IconButton,
  Select,
  TextArea,
} from '@lumen/ui';
import { MoreHorizontal, UserX, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useCan } from '../../lib/session';
import { useCancelAppointment, useCheckIn, useMarkNoShow, useStartEncounter } from './hooks';

type CancelOutcome = 'CANCELLED_BY_PATIENT' | 'CANCELLED_BY_CLINIC' | 'LEFT_WITHOUT_BEING_SEEN';

function CancelDialog({
  appt,
  open,
  onOpenChange,
}: {
  appt: AppointmentView;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const cancel = useCancelAppointment();
  const [outcome, setOutcome] = useState<CancelOutcome>(
    appt.status === 'CHECKED_IN' ? 'LEFT_WITHOUT_BEING_SEEN' : 'CANCELLED_BY_PATIENT',
  );
  const [note, setNote] = useState('');
  const options: CancelOutcome[] =
    appt.status === 'CHECKED_IN'
      ? ['LEFT_WITHOUT_BEING_SEEN', 'CANCELLED_BY_CLINIC']
      : ['CANCELLED_BY_PATIENT', 'CANCELLED_BY_CLINIC'];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Cancel appointment"
        description={`${appt.patient.displayName} will be removed from ${appt.status === 'CHECKED_IN' ? 'the queue' : 'the schedule'}.`}
        size="sm"
        footer={
          <>
            <Button onClick={() => onOpenChange(false)}>Keep appointment</Button>
            <Button
              variant="destructive"
              loading={cancel.isPending}
              onClick={() =>
                cancel.mutate(
                  { id: appt.id, outcome, note: note || undefined },
                  { onSuccess: () => onOpenChange(false) },
                )
              }
            >
              Cancel appointment
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Reason">
            <Select value={outcome} onChange={(e) => setOutcome(e.target.value as CancelOutcome)}>
              {options.map((o) => (
                <option key={o} value={o}>
                  {APPOINTMENT_OUTCOME_LABELS[o]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Note" optional>
            <TextArea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
            />
          </FormField>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** The primary action for an appointment plus a menu of the rest, offered only where valid for its status. */
export function AppointmentActions({ appt }: { appt: AppointmentView }) {
  const canQueue = useCan('queue.manage');
  const canStart = useCan('encounters.start');
  const canWrite = useCan('appointments.write');
  const canReadEncounters = useCan('encounters.read');
  const checkIn = useCheckIn();
  const start = useStartEncounter();
  const noShow = useMarkNoShow();
  const [cancelOpen, setCancelOpen] = useState(false);

  const canCancel = canWrite && canTransitionAppointment(appt.status, 'CANCELLED');
  const canNoShow =
    canWrite &&
    canTransitionAppointment(appt.status, 'NO_SHOW') &&
    new Date(appt.scheduledStart) <= new Date();

  return (
    <div className="flex items-center justify-end gap-1.5">
      {appt.status === 'SCHEDULED' && canQueue && (
        <Button
          size="sm"
          loading={checkIn.isPending && checkIn.variables === appt.id}
          onClick={() => checkIn.mutate(appt.id)}
        >
          Check in
        </Button>
      )}
      {appt.status === 'CHECKED_IN' && canStart && (
        <Button
          size="sm"
          variant="primary"
          loading={start.isPending && start.variables?.id === appt.id}
          onClick={() => start.mutate(appt)}
        >
          Start
        </Button>
      )}
      {appt.status === 'IN_CONSULTATION' && appt.encounterId && canReadEncounters && (
        <Link
          to={`/encounters/${appt.encounterId}`}
          className="inline-flex h-7 items-center rounded-md border border-rule-strong bg-surface px-2.5 text-sm font-medium text-ink-800 hover:bg-sunken"
        >
          Open
        </Link>
      )}
      {(canCancel || canNoShow) && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton label={`More actions for ${appt.patient.displayName}`} size="sm">
                <MoreHorizontal />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {canNoShow && (
                <DropdownMenuItem onSelect={() => noShow.mutate(appt.id)}>
                  <UserX /> Mark as did not attend
                </DropdownMenuItem>
              )}
              {canCancel && (
                <DropdownMenuItem tone="danger" onSelect={() => setCancelOpen(true)}>
                  <XCircle className="!text-danger-600" /> Cancel appointment
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {canCancel && <CancelDialog appt={appt} open={cancelOpen} onOpenChange={setCancelOpen} />}
        </>
      )}
    </div>
  );
}
