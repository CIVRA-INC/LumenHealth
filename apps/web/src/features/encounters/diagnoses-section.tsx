import {
  addDiagnosisSchema,
  DIAGNOSIS_CERTAINTIES,
  DIAGNOSIS_TYPES,
  type AddDiagnosisInput,
  type EncounterDetail,
} from '@lumen/contracts';
import { Button, FormField, Select, StatusIndicator, Tag, TextField } from '@lumen/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError, api } from '../../lib/api';
import { base, useEncounterAction } from './hooks';
import { EncounterSection } from './section';

export function DiagnosesSection({
  encounter,
  editable,
}: {
  encounter: EncounterDetail;
  editable: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const hasPrimary = encounter.diagnoses.some((d) => d.type === 'PRIMARY');
  const form = useForm<AddDiagnosisInput, unknown, ReturnType<typeof addDiagnosisSchema.parse>>({
    resolver: zodResolver(addDiagnosisSchema),
    defaultValues: {
      description: '',
      type: hasPrimary ? 'SECONDARY' : 'PRIMARY',
      certainty: 'PROVISIONAL',
    },
  });
  const add = useEncounterAction(
    encounter.id,
    (v: ReturnType<typeof addDiagnosisSchema.parse>) =>
      api.post<EncounterDetail>(`${base(encounter.id)}/diagnoses`, v),
    {
      success: 'Diagnosis added',
    },
  );
  const remove = useEncounterAction(encounter.id, (id: string) =>
    api.delete<EncounterDetail>(`${base(encounter.id)}/diagnoses/${id}`),
  );
  const { errors } = form.formState;

  const reset = () => {
    form.reset({
      description: '',
      icd10Code: undefined,
      type: 'SECONDARY',
      certainty: 'PROVISIONAL',
    });
    setAdding(false);
  };

  return (
    <EncounterSection
      id="diagnoses"
      title="Diagnoses"
      meta={editable && !hasPrimary ? 'Primary diagnosis required to sign' : undefined}
      action={
        editable &&
        !adding && (
          <Button
            size="sm"
            onClick={() => (
              form.setValue('type', hasPrimary ? 'SECONDARY' : 'PRIMARY'),
              setAdding(true)
            )}
          >
            Add diagnosis
          </Button>
        )
      }
    >
      {encounter.diagnoses.length === 0 && !adding ? (
        <p className="text-base text-ink-500">
          {editable ? 'None recorded yet.' : 'No diagnosis was recorded.'}
        </p>
      ) : (
        <ul className="divide-y divide-rule-soft border-y border-rule-soft">
          {encounter.diagnoses.map((d) => (
            <li key={d.id} className="flex items-start gap-4 py-3">
              <span className="data w-16 shrink-0 pt-px text-sm text-ink-700">
                {d.icd10Code ?? <span className="text-ink-300">no code</span>}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-md font-medium text-ink-950">{d.description}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {d.type === 'PRIMARY' ? (
                    <Tag tone="inverse">Primary</Tag>
                  ) : (
                    <span className="text-xs text-ink-600">Secondary</span>
                  )}
                  <StatusIndicator
                    tone={d.certainty === 'CONFIRMED' ? 'success' : 'neutral'}
                    pending={d.certainty !== 'CONFIRMED'}
                    className="text-xs"
                  >
                    {d.certainty === 'CONFIRMED' ? 'Confirmed' : 'Provisional'}
                  </StatusIndicator>
                </p>
              </div>
              {editable && (
                <Button
                  variant="quiet"
                  size="sm"
                  className="hover:text-danger-700"
                  aria-label={`Remove diagnosis ${d.description}`}
                  loading={remove.isPending && remove.variables === d.id}
                  onClick={() => remove.mutate(d.id)}
                >
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {adding && (
        <form
          noValidate
          className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-6"
          onSubmit={form.handleSubmit((v) => add.mutate(v, { onSuccess: reset }))}
        >
          <FormField
            label="Diagnosis"
            required
            className="sm:col-span-4"
            error={
              errors.description?.message ??
              (add.error instanceof ApiError ? add.error.fieldErrors.description : undefined)
            }
          >
            <TextField autoFocus autoComplete="off" {...form.register('description')} />
          </FormField>
          <FormField
            label="ICD-10 code"
            optional
            className="sm:col-span-2"
            error={errors.icd10Code?.message}
          >
            <TextField
              autoComplete="off"
              placeholder="J02.9"
              {...form.register('icd10Code', { setValueAs: (v: string) => v || undefined })}
            />
          </FormField>
          <FormField label="Type" className="sm:col-span-3">
            <Select {...form.register('type')}>
              {DIAGNOSIS_TYPES.map((t) => (
                <option key={t} value={t} disabled={t === 'PRIMARY' && hasPrimary}>
                  {t === 'PRIMARY' ? 'Primary' : 'Secondary'}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Certainty" className="sm:col-span-3">
            <Select {...form.register('certainty')}>
              {DIAGNOSIS_CERTAINTIES.map((c) => (
                <option key={c} value={c}>
                  {c === 'CONFIRMED' ? 'Confirmed' : 'Provisional'}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="flex justify-end gap-2 sm:col-span-6">
            <Button onClick={reset}>Cancel</Button>
            <Button type="submit" variant="primary" loading={add.isPending}>
              Add diagnosis
            </Button>
          </div>
        </form>
      )}
    </EncounterSection>
  );
}
