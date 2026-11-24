import {
  DISPOSITIONS,
  DISPOSITION_LABELS,
  type Disposition,
  type EncounterDetail,
} from '@lumen/contracts';
import {
  Button,
  ConfirmDialog,
  Dialog,
  DialogContent,
  FormField,
  Select,
  TextArea,
} from '@lumen/ui';
import { Check, Circle } from 'lucide-react';
import { useState, type MutableRefObject } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../../lib/api';
import { base, useEncounterAction } from './hooks';

export function readiness(e: EncounterDetail) {
  return [
    { label: 'Chief complaint', done: !!e.note?.chiefComplaint?.trim() },
    { label: 'Primary diagnosis', done: e.diagnoses.some((d) => d.type === 'PRIMARY') },
  ];
}

export function SignDialog({
  encounter,
  open,
  onOpenChange,
  flushRef,
}: {
  encounter: EncounterDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flushRef: MutableRefObject<(() => Promise<void>) | null>;
}) {
  const finalize = useEncounterAction(
    encounter.id,
    () => api.post<EncounterDetail>(`${base(encounter.id)}/finalize`, { confirm: true }),
    {
      success: 'Encounter signed',
    },
  );
  const [flushing, setFlushing] = useState(false);
  const checks = readiness(encounter);
  const ready = checks.every((c) => c.done);
  const drafts = encounter.medicationOrders.filter((o) => o.status === 'DRAFT').length;

  const confirm = async () => {
    setFlushing(true);
    try {
      await flushRef.current?.(); // make sure the latest note text is on the server first
      finalize.mutate(undefined, { onSuccess: () => onOpenChange(false) });
    } catch {
      // The note editor already shows that saving failed; stay open.
    } finally {
      setFlushing(false);
    }
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Sign and lock this encounter?"
      description={
        <>
          You are signing the record for{' '}
          <strong className="text-ink-900">{encounter.patient.displayName}</strong> (
          {encounter.patient.mrn}). After signing, the note, vitals, diagnoses and prescription can
          no longer be edited. Corrections are added as addenda.
        </>
      }
      confirmLabel="Sign encounter"
      loading={finalize.isPending || flushing}
      requireAcknowledgement={
        ready
          ? 'I have reviewed this documentation and confirm it is accurate and complete.'
          : undefined
      }
      onConfirm={() => void confirm()}
    >
      <ul className="space-y-1.5 rounded-md border border-rule bg-sunken/60 p-3 text-sm">
        {checks.map((c) => (
          <li key={c.label} className="flex items-center gap-2 text-ink-800">
            {c.done ? (
              <Check className="size-4 text-success-600" aria-hidden />
            ) : (
              <Circle className="size-4 text-danger-600" aria-hidden />
            )}
            {c.label}
            {!c.done && <span className="font-medium text-danger-700">Required</span>}
          </li>
        ))}
        <li className="flex items-center gap-2 text-ink-600">
          <span className="w-4 text-center text-ink-400" aria-hidden>
            ·
          </span>
          {encounter.vitals.filter((v) => !v.enteredInError).length} vitals recording(s), {drafts}{' '}
          medication order(s) to activate
        </li>
      </ul>
      {!ready && (
        <p className="mt-3 text-sm font-medium text-danger-700">
          Complete the required items before signing.
        </p>
      )}
    </ConfirmDialog>
  );
}

export function CloseDialog({
  encounter,
  open,
  onOpenChange,
}: {
  encounter: EncounterDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [disposition, setDisposition] = useState<Disposition>('DISCHARGED_HOME');
  const [instructions, setInstructions] = useState('');
  const close = useEncounterAction(
    encounter.id,
    () =>
      api.post<EncounterDetail>(`${base(encounter.id)}/close`, {
        disposition,
        dischargeInstructions: instructions || undefined,
      }),
    { success: 'Encounter closed' },
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="sm"
        title="Close encounter"
        description={`Record how ${encounter.patient.givenName}’s visit concluded.`}
        footer={
          <>
            <Button onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              variant="primary"
              loading={close.isPending}
              onClick={() => close.mutate(undefined, { onSuccess: () => onOpenChange(false) })}
            >
              Close encounter
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Disposition" required>
            <Select
              value={disposition}
              onChange={(e) => setDisposition(e.target.value as Disposition)}
            >
              {DISPOSITIONS.map((d) => (
                <option key={d} value={d}>
                  {DISPOSITION_LABELS[d]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Discharge instructions" optional>
            <TextArea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              maxLength={2000}
            />
          </FormField>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function VoidEncounterDialog({
  encounter,
  open,
  onOpenChange,
}: {
  encounter: EncounterDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const [reason, setReason] = useState('');
  const voidIt = useEncounterAction(
    encounter.id,
    () => api.post<EncounterDetail>(`${base(encounter.id)}/void`, { reason }),
    {
      success: 'Encounter marked as entered in error',
    },
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="sm"
        title="Mark encounter as entered in error"
        description={`Use this only if the encounter was opened by mistake, for example on the wrong chart. ${encounter.patient.displayName} will return to the waiting room.`}
        footer={
          <>
            <Button onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={reason.trim().length < 5}
              loading={voidIt.isPending}
              onClick={() =>
                voidIt.mutate(undefined, {
                  onSuccess: () => (onOpenChange(false), navigate('/consultations')),
                })
              }
            >
              Mark as error
            </Button>
          </>
        }
      >
        <FormField label="Reason" required description="Recorded permanently in the audit trail.">
          <TextArea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={300}
          />
        </FormField>
      </DialogContent>
    </Dialog>
  );
}
