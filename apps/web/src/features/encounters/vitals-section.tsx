import {
  computeBmi,
  recordVitalsSchema,
  type EncounterDetail,
  type RecordVitalsInput,
  type VitalsView,
} from '@lumen/contracts';
import {
  Button,
  Dialog,
  DialogContent,
  FormField,
  TextField,
  TextArea,
  DataTable,
} from '@lumen/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { api } from '../../lib/api';
import { formatTime } from '../../lib/format';
import { useCan, useRequiredSession } from '../../lib/session';
import { base, useEncounterAction } from './hooks';
import { EncounterSection } from './section';

const num = (v: unknown) =>
  v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? undefined : Number(v);

function VitalsDialog({
  encounter,
  open,
  onOpenChange,
}: {
  encounter: EncounterDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const form = useForm<RecordVitalsInput>({
    resolver: zodResolver(recordVitalsSchema),
    defaultValues: {},
  });
  const save = useEncounterAction(
    encounter.id,
    (v: RecordVitalsInput) => api.post<EncounterDetail>(`${base(encounter.id)}/vitals`, v),
    {
      success: 'Vitals recorded',
    },
  );
  const { errors } = form.formState;
  const [weight, height] = useWatch({ control: form.control, name: ['weightKg', 'heightCm'] });
  const bmi = computeBmi(num(weight), num(height));
  const n = (name: keyof RecordVitalsInput) => form.register(name, { setValueAs: num });

  return (
    <Dialog open={open} onOpenChange={(next) => (onOpenChange(next), !next && form.reset({}))}>
      <DialogContent
        title="Record vitals"
        description="Enter what you measured. Leave the rest blank."
        footer={
          <>
            <Button onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              variant="primary"
              loading={save.isPending}
              onClick={form.handleSubmit((v) =>
                save.mutate(v, { onSuccess: () => (onOpenChange(false), form.reset({})) }),
              )}
            >
              Save vitals
            </Button>
          </>
        }
      >
        <form
          noValidate
          className="grid grid-cols-1 gap-4 sm:grid-cols-3"
          onSubmit={(e) => e.preventDefault()}
        >
          <FormField label="Temperature (°C)" error={errors.temperatureC?.message}>
            <TextField inputMode="decimal" {...n('temperatureC')} />
          </FormField>
          <FormField label="Heart rate (bpm)" error={errors.heartRate?.message}>
            <TextField inputMode="numeric" {...n('heartRate')} />
          </FormField>
          <FormField label="Resp. rate (/min)" error={errors.respiratoryRate?.message}>
            <TextField inputMode="numeric" {...n('respiratoryRate')} />
          </FormField>
          <FormField label="Systolic BP (mmHg)" error={errors.systolicBp?.message}>
            <TextField inputMode="numeric" {...n('systolicBp')} />
          </FormField>
          <FormField label="Diastolic BP (mmHg)" error={errors.diastolicBp?.message}>
            <TextField inputMode="numeric" {...n('diastolicBp')} />
          </FormField>
          <FormField label="SpO₂ (%)" error={errors.spo2?.message}>
            <TextField inputMode="numeric" {...n('spo2')} />
          </FormField>
          <FormField label="Weight (kg)" error={errors.weightKg?.message}>
            <TextField inputMode="decimal" {...n('weightKg')} />
          </FormField>
          <FormField label="Height (cm)" error={errors.heightCm?.message}>
            <TextField inputMode="decimal" {...n('heightCm')} />
          </FormField>
          <FormField label="BMI" description="Calculated">
            <TextField readOnly value={bmi ?? ''} tabIndex={-1} />
          </FormField>
          <FormField label="Note" optional className="sm:col-span-3" error={errors.note?.message}>
            <TextArea
              rows={2}
              {...form.register('note', { setValueAs: (v: string) => v || undefined })}
            />
          </FormField>
          {errors.root?.message && (
            <p className="text-sm text-danger-700 sm:col-span-3">{errors.root.message}</p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

function VoidDialog({
  encounterId,
  entry,
  onClose,
}: {
  encounterId: string;
  entry: VitalsView | null;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const mark = useEncounterAction(
    encounterId,
    (r: string) =>
      api.post<EncounterDetail>(`${base(encounterId)}/vitals/${entry?.id}/void`, { reason: r }),
    {
      success: 'Marked as entered in error',
    },
  );
  return (
    <Dialog open={!!entry} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        size="sm"
        title="Mark as entered in error"
        description="The entry stays on the record, struck through, with your reason."
        footer={
          <>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              variant="destructive"
              loading={mark.isPending}
              disabled={reason.trim().length < 3}
              onClick={() => mark.mutate(reason, { onSuccess: () => (setReason(''), onClose()) })}
            >
              Mark as error
            </Button>
          </>
        }
      >
        <FormField label="Reason" required>
          <TextArea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </FormField>
      </DialogContent>
    </Dialog>
  );
}

const cell = (v: number | null, suffix = '') =>
  v === null ? <span className="text-ink-300">–</span> : `${v}${suffix}`;

/**
 * One measurement: label, value, unit. Cells share a baseline grid and are separated by hairlines rather
 * than boxes, so the set reads as a single clinical reading. No interpretation is added: a value is shown
 * as measured, with its unit, and nothing is coloured as normal or abnormal.
 */
function Reading({ label, value, unit }: { label: string; value: string | null; unit?: string }) {
  return (
    <div className="border-l border-rule-soft pl-4 first:border-l-0 first:pl-0 max-sm:nth-[odd]:border-l-0 max-sm:nth-[odd]:pl-0 sm:nth-[4n+1]:border-l-0 sm:nth-[4n+1]:pl-0">
      <dt className="text-xs text-ink-500">{label}</dt>
      <dd className="data mt-0.5 text-xl leading-7 font-medium text-ink-950">
        {value ?? <span className="text-ink-300">–</span>}
        {value && unit && (
          <span className="ml-1 font-sans text-xs font-normal tracking-normal text-ink-500">
            {unit}
          </span>
        )}
      </dd>
    </div>
  );
}

export function VitalsSection({ encounter }: { encounter: EncounterDetail }) {
  const tz = useRequiredSession().organization.timezone;
  const canRecord = useCan('vitals.record') && encounter.status === 'IN_PROGRESS';
  const [open, setOpen] = useState(false);
  const [voiding, setVoiding] = useState<VitalsView | null>(null);
  const [showEarlier, setShowEarlier] = useState(false);

  const valid = encounter.vitals.filter((v) => !v.enteredInError);
  const latest = valid[0];
  const earlier = encounter.vitals.filter((v) => v !== latest);

  return (
    <EncounterSection
      id="vitals"
      title="Vitals"
      action={
        canRecord && (
          <Button size="sm" onClick={() => setOpen(true)}>
            Record vitals
          </Button>
        )
      }
    >
      {!latest ? (
        <p className="text-base text-ink-500">
          {canRecord
            ? 'Nothing recorded yet. Add temperature, pulse, blood pressure and other measurements.'
            : 'No vitals were recorded.'}
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
            <Reading
              label="Blood pressure"
              value={
                latest.systolicBp !== null && latest.diastolicBp !== null
                  ? `${latest.systolicBp}/${latest.diastolicBp}`
                  : null
              }
              unit="mmHg"
            />
            <Reading
              label="Pulse"
              value={latest.heartRate !== null ? String(latest.heartRate) : null}
              unit="/min"
            />
            <Reading
              label="Respiration"
              value={latest.respiratoryRate !== null ? String(latest.respiratoryRate) : null}
              unit="/min"
            />
            <Reading
              label="SpO₂"
              value={latest.spo2 !== null ? String(latest.spo2) : null}
              unit="%"
            />
            <Reading
              label="Temperature"
              value={latest.temperatureC !== null ? latest.temperatureC.toFixed(1) : null}
              unit="°C"
            />
            <Reading
              label="Weight"
              value={latest.weightKg !== null ? String(latest.weightKg) : null}
              unit="kg"
            />
            <Reading
              label="Height"
              value={latest.heightCm !== null ? String(latest.heightCm) : null}
              unit="cm"
            />
            <Reading label="BMI" value={latest.bmi !== null ? String(latest.bmi) : null} />
          </dl>
          <p className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-rule-soft pt-3 text-xs text-ink-500">
            <span>
              Recorded <span className="data">{formatTime(latest.recordedAt, tz)}</span> by{' '}
              {latest.recordedBy.fullName}
            </span>
            {latest.note && <span className="text-ink-600">Note: {latest.note}</span>}
            {canRecord && (
              <button
                type="button"
                className="ml-auto text-ink-600 underline decoration-ink-300 underline-offset-2 hover:text-danger-700 hover:decoration-danger-600"
                onClick={() => setVoiding(latest)}
              >
                Mark as entered in error
              </button>
            )}
          </p>
          {earlier.length > 0 && (
            <div className="mt-4">
              <button
                type="button"
                aria-expanded={showEarlier}
                className="text-sm font-medium text-green-700 hover:underline"
                onClick={() => setShowEarlier((v) => !v)}
              >
                {showEarlier ? 'Hide' : 'Show'} earlier readings ({earlier.length})
              </button>
              {showEarlier && (
                <div className="mt-2">
                  <DataTable
                    caption="Earlier vitals readings"
                    rows={earlier}
                    rowKey={(v) => v.id}
                    empty={null}
                    columns={[
                      {
                        id: 'time',
                        header: 'Time',
                        mobile: 'title',
                        cell: (v: VitalsView) => (
                          <span className={`data ${v.enteredInError ? 'text-ink-400' : ''}`}>
                            {formatTime(v.recordedAt, tz)}
                          </span>
                        ),
                      },
                      {
                        id: 'temp',
                        header: 'Temp',
                        mobile: 'meta',
                        cell: (v: VitalsView) => (
                          <span className="data">{cell(v.temperatureC, '°')}</span>
                        ),
                      },
                      {
                        id: 'pulse',
                        header: 'Pulse',
                        mobile: 'meta',
                        cell: (v: VitalsView) => <span className="data">{cell(v.heartRate)}</span>,
                      },
                      {
                        id: 'resp',
                        header: 'Resp',
                        showFrom: 'lg',
                        mobile: 'hidden',
                        cell: (v: VitalsView) => (
                          <span className="data">{cell(v.respiratoryRate)}</span>
                        ),
                      },
                      {
                        id: 'bp',
                        header: 'BP',
                        mobile: 'meta',
                        cell: (v: VitalsView) => (
                          <span className="data">
                            {v.systolicBp !== null && v.diastolicBp !== null
                              ? `${v.systolicBp}/${v.diastolicBp}`
                              : cell(null)}
                          </span>
                        ),
                      },
                      {
                        id: 'spo2',
                        header: 'SpO₂',
                        showFrom: 'lg',
                        mobile: 'hidden',
                        cell: (v: VitalsView) => <span className="data">{cell(v.spo2, '%')}</span>,
                      },
                      {
                        id: 'by',
                        header: 'By',
                        showFrom: 'md',
                        mobile: 'meta',
                        className: 'whitespace-nowrap',
                        cell: (v: VitalsView) => v.recordedBy.fullName,
                      },
                      {
                        id: 'state',
                        header: 'State',
                        mobile: 'meta',
                        cell: (v: VitalsView) =>
                          v.enteredInError ? (
                            <span className="text-xs text-ink-500">Entered in error</span>
                          ) : null,
                      },
                    ]}
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}
      <VitalsDialog encounter={encounter} open={open} onOpenChange={setOpen} />
      <VoidDialog encounterId={encounter.id} entry={voiding} onClose={() => setVoiding(null)} />
    </EncounterSection>
  );
}
