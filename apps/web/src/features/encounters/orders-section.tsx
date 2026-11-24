import {
  addMedicationOrderSchema,
  ROUTES,
  ROUTE_LABELS,
  type AddMedicationOrderInput,
  type EncounterDetail,
  type MedicationOrderView,
} from '@lumen/contracts';
import {
  Button,
  Dialog,
  DialogContent,
  FormField,
  TextField,
  Select,
  TextArea,
  StatusIndicator,
} from '@lumen/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../../lib/api';
import { useCan } from '../../lib/session';
import { base, useEncounterAction } from './hooks';
import { EncounterSection } from './section';

type Parsed = ReturnType<typeof addMedicationOrderSchema.parse>;
const optionalNumber = (v: unknown) =>
  v === '' || v === undefined || v === null || Number.isNaN(Number(v)) ? undefined : Number(v);

function OrderDialog({
  encounter,
  open,
  onOpenChange,
}: {
  encounter: EncounterDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const form = useForm<AddMedicationOrderInput, unknown, Parsed>({
    resolver: zodResolver(addMedicationOrderSchema),
    defaultValues: { drugName: '', route: 'ORAL', dose: '', frequency: '' },
  });
  const add = useEncounterAction(
    encounter.id,
    (v: Parsed) => api.post<EncounterDetail>(`${base(encounter.id)}/medication-orders`, v),
    {
      success: 'Added to prescription',
    },
  );
  const { errors } = form.formState;
  const text = (name: keyof AddMedicationOrderInput) =>
    form.register(name, { setValueAs: (v: string) => v || undefined });

  return (
    <Dialog open={open} onOpenChange={(next) => (onOpenChange(next), !next && form.reset())}>
      <DialogContent
        size="lg"
        title="Add medication"
        description="Orders stay as drafts and become active when you sign the encounter."
        footer={
          <>
            <Button onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              variant="primary"
              loading={add.isPending}
              onClick={form.handleSubmit((v) =>
                add.mutate(v, { onSuccess: () => (onOpenChange(false), form.reset()) }),
              )}
            >
              Add medication
            </Button>
          </>
        }
      >
        <form
          noValidate
          className="grid grid-cols-1 gap-4 sm:grid-cols-6"
          onSubmit={(e) => e.preventDefault()}
        >
          <FormField
            label="Medication"
            required
            className="sm:col-span-4"
            error={errors.drugName?.message}
          >
            <TextField autoFocus autoComplete="off" {...form.register('drugName')} />
          </FormField>
          <FormField
            label="Strength"
            optional
            className="sm:col-span-2"
            error={errors.strength?.message}
          >
            <TextField autoComplete="off" placeholder="e.g. 500 mg" {...text('strength')} />
          </FormField>
          <FormField label="Form" optional className="sm:col-span-2" error={errors.form?.message}>
            <TextField autoComplete="off" placeholder="e.g. tablet" {...text('form')} />
          </FormField>
          <FormField label="Route" className="sm:col-span-2">
            <Select {...form.register('route')}>
              {ROUTES.map((r) => (
                <option key={r} value={r}>
                  {ROUTE_LABELS[r]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Dose" required className="sm:col-span-2" error={errors.dose?.message}>
            <TextField autoComplete="off" placeholder="e.g. 1 tablet" {...form.register('dose')} />
          </FormField>
          <FormField
            label="Frequency"
            required
            className="sm:col-span-3"
            error={errors.frequency?.message}
          >
            <TextField
              autoComplete="off"
              placeholder="e.g. twice daily"
              {...form.register('frequency')}
            />
          </FormField>
          <FormField
            label="Duration (days)"
            optional
            className="sm:col-span-1"
            error={errors.durationDays?.message}
          >
            <TextField
              inputMode="numeric"
              {...form.register('durationDays', { setValueAs: optionalNumber })}
            />
          </FormField>
          <FormField
            label="Quantity"
            optional
            className="sm:col-span-2"
            error={errors.quantity?.message}
          >
            <TextField
              inputMode="numeric"
              {...form.register('quantity', { setValueAs: optionalNumber })}
            />
          </FormField>
          <FormField
            label="Instructions"
            optional
            className="sm:col-span-6"
            error={errors.instructions?.message}
          >
            <TextArea rows={2} placeholder="e.g. take after meals" {...text('instructions')} />
          </FormField>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CancelOrderDialog({
  encounterId,
  order,
  onClose,
}: {
  encounterId: string;
  order: MedicationOrderView | null;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const cancel = useEncounterAction(
    encounterId,
    (r: string) =>
      api.post<EncounterDetail>(`${base(encounterId)}/medication-orders/${order?.id}/cancel`, {
        reason: r,
      }),
    { success: 'Medication cancelled' },
  );
  return (
    <Dialog open={!!order} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        size="sm"
        title="Cancel medication"
        description={
          order ? `${order.drugName} stays on the record, marked as cancelled.` : undefined
        }
        footer={
          <>
            <Button onClick={onClose}>Keep medication</Button>
            <Button
              variant="destructive"
              loading={cancel.isPending}
              disabled={reason.trim().length < 3}
              onClick={() => cancel.mutate(reason, { onSuccess: () => (setReason(''), onClose()) })}
            >
              Cancel medication
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

const STATUS_LABEL = { DRAFT: 'Draft', ACTIVE: 'Active', CANCELLED: 'Cancelled' } as const;
const STATUS_TONE = { DRAFT: 'warning', ACTIVE: 'success', CANCELLED: 'neutral' } as const;

export function OrdersSection({
  encounter,
  editable,
}: {
  encounter: EncounterDetail;
  editable: boolean;
}) {
  const canPrescribe = useCan('orders.prescribe');
  const [open, setOpen] = useState(false);
  const [cancelling, setCancelling] = useState<MedicationOrderView | null>(null);
  const remove = useEncounterAction(encounter.id, (id: string) =>
    api.delete<EncounterDetail>(`${base(encounter.id)}/medication-orders/${id}`),
  );
  const signed = encounter.status === 'FINALIZED' || encounter.status === 'CLOSED';
  const drafts = encounter.medicationOrders.filter((o) => o.status === 'DRAFT').length;

  return (
    <EncounterSection
      id="orders"
      title="Prescription"
      meta={drafts > 0 ? `${drafts} draft: issued when you sign` : undefined}
      action={
        editable &&
        canPrescribe && (
          <Button size="sm" onClick={() => setOpen(true)}>
            Add medication
          </Button>
        )
      }
    >
      {encounter.medicationOrders.length === 0 ? (
        <p className="text-base text-ink-500">
          {editable ? 'No medication ordered yet.' : 'No medication was ordered.'}
        </p>
      ) : (
        <ul className="divide-y divide-rule-soft border-y border-rule-soft">
          {encounter.medicationOrders.map((o) => {
            const draft = o.status === 'DRAFT';
            const cancelled = o.status === 'CANCELLED';
            return (
              <li
                key={o.id}
                // A draft is visibly provisional (dashed amber edge); an issued order is plain and solid.
                className={`flex items-start gap-4 py-3 ${draft ? 'border-l-2 border-dashed border-warning-600 bg-warning-50/40 pl-4' : ''}`}
              >
                <div className={`min-w-0 flex-1 ${cancelled ? 'text-ink-400' : ''}`}>
                  <p
                    className={`text-md font-medium ${cancelled ? 'line-through' : 'text-ink-950'}`}
                  >
                    {o.drugName}
                    {o.strength && (
                      <span className="data ml-2 text-sm font-normal text-ink-700">
                        {o.strength}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-base text-ink-800">
                    {[
                      o.dose,
                      ROUTE_LABELS[o.route].toLowerCase(),
                      o.frequency,
                      o.durationDays ? `for ${o.durationDays} days` : null,
                      o.quantity ? `quantity ${o.quantity}` : null,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                  {o.instructions && (
                    <p className="mt-0.5 text-sm text-ink-600">{o.instructions}</p>
                  )}
                  {o.cancelReason && (
                    <p className="mt-0.5 text-sm text-ink-600">Cancelled: {o.cancelReason}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <StatusIndicator tone={STATUS_TONE[o.status]} pending={draft}>
                    {STATUS_LABEL[o.status]}
                  </StatusIndicator>
                  {editable && draft && (
                    <Button
                      variant="quiet"
                      size="sm"
                      className="hover:text-danger-700"
                      aria-label={`Remove ${o.drugName}`}
                      loading={remove.isPending && remove.variables === o.id}
                      onClick={() => remove.mutate(o.id)}
                    >
                      Remove
                    </Button>
                  )}
                  {signed && canPrescribe && o.status === 'ACTIVE' && (
                    <Button variant="destructive-quiet" size="sm" onClick={() => setCancelling(o)}>
                      Cancel order
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {signed && encounter.medicationOrders.some((o) => o.status === 'ACTIVE') && (
        <p className="mt-3 text-xs text-ink-500">
          Active orders were issued when this encounter was signed. They can be cancelled with a
          reason, not edited.
        </p>
      )}
      <OrderDialog encounter={encounter} open={open} onOpenChange={setOpen} />
      <CancelOrderDialog
        encounterId={encounter.id}
        order={cancelling}
        onClose={() => setCancelling(null)}
      />
    </EncounterSection>
  );
}
