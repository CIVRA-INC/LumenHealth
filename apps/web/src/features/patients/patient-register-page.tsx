import { zodResolver } from '@hookform/resolvers/zod';
import {
  createPatientSchema,
  ERROR_CODES,
  IDENTIFIER_LABELS,
  IDENTIFIER_TYPES,
  type CreatePatientInput,
  type CreatePatientParsed,
  type DuplicateCandidate,
  type PatientDetail,
} from '@lumen/contracts';
import { Alert, ConfirmDialog, FormField, TextField, Select, FormSection } from '@lumen/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { Page, PageHeader } from '../../components/page';
import { ApiError, api } from '../../lib/api';
import { errorMessage } from '../../lib/errors';
import { useDebounced } from '../../lib/use-debounced';
import { DuplicateCandidates } from './duplicate-candidates';
import { PatientFields } from './patient-fields';
import { PatientFormShell } from './patient-form-shell';

export function PatientRegisterPage() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const saved = useRef(false);
  const [pendingDuplicates, setPendingDuplicates] = useState<DuplicateCandidate[] | null>(null);
  const [identifierClash, setIdentifierClash] = useState<DuplicateCandidate[] | null>(null);

  const form = useForm<CreatePatientInput, unknown, CreatePatientParsed>({
    resolver: zodResolver(createPatientSchema),
    mode: 'onBlur',
    defaultValues: {
      givenName: '',
      familyName: '',
      dateOfBirth: '',
      phone: '',
      emergencyContacts: [],
      identifiers: [],
    },
  });
  const { register, control, handleSubmit, formState, getValues } = form;

  // Live duplicate hint while typing: name and date of birth are enough to check.
  const [given, family, dob, phone] = useWatch({
    control,
    name: ['givenName', 'familyName', 'dateOfBirth', 'phone'],
  });
  const hint = useDebounced({ given, family, dob, phone }, 500);
  const hintReady = hint.given && hint.family && /^\d{4}-\d{2}-\d{2}$/.test(hint.dob ?? '');
  const hintQuery = useQuery({
    queryKey: ['patients', 'duplicate-hint', hint],
    queryFn: () =>
      api.post<DuplicateCandidate[]>('/patients/duplicate-check', {
        givenName: hint.given,
        familyName: hint.family,
        dateOfBirth: hint.dob,
        ...(hint.phone && hint.phone.replace(/\D/g, '').length >= 10 ? { phone: hint.phone } : {}),
      }),
    enabled: !!hintReady,
    retry: false,
  });

  // The optional identifier is held outside the form: an empty row must not fail validation.
  const [idType, setIdType] = useState<(typeof IDENTIFIER_TYPES)[number] | ''>('');
  const [idValue, setIdValue] = useState('');
  const identifiers = idType && idValue.trim() ? [{ type: idType, value: idValue.trim() }] : [];

  const create = useMutation({
    mutationFn: (input: CreatePatientParsed) => api.post<PatientDetail>('/patients', input),
    onSuccess: async (patient) => {
      saved.current = true;
      await client.invalidateQueries({ queryKey: ['patients'] });
      navigate(`/patients/${patient.id}`, { state: { justRegistered: true } });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === ERROR_CODES.duplicatePatient) {
        setPendingDuplicates((error.details as { candidates: DuplicateCandidate[] }).candidates);
      } else if (error instanceof ApiError && error.code === ERROR_CODES.duplicateIdentifier) {
        setIdentifierClash((error.details as { candidates: DuplicateCandidate[] }).candidates);
      } else if (error instanceof ApiError && error.status === 400) {
        for (const [path, message] of Object.entries(error.fieldErrors))
          form.setError(path as keyof CreatePatientInput, { message });
      }
    },
  });

  const hintMatches = hintQuery.data ?? [];
  const dirty = formState.isDirty || idType !== '' || idValue !== '';

  return (
    <Page width="form">
      <PageHeader
        title="Register patient"
        crumbs={[{ label: 'Patients', to: '/patients' }, { label: 'Register' }]}
        description="A medical record number is assigned when you save."
      />

      <PatientFormShell
        dirty={dirty}
        savedRef={saved}
        saving={create.isPending && !pendingDuplicates}
        submitLabel="Register patient"
        cancelTo="/patients"
        onSubmit={() => void handleSubmit((values) => create.mutate({ ...values, identifiers }))()}
      >
        <div className="space-y-4 pb-4 empty:hidden">
          {identifierClash && (
            <Alert tone="danger" title="This ID is already registered">
              <p className="mb-3">
                A patient with the same identifier exists. Open their record instead of creating a
                second one.
              </p>
              <DuplicateCandidates candidates={identifierClash} />
            </Alert>
          )}
          {hintMatches.length > 0 && !identifierClash && (
            <Alert tone="warning" title="This person may already be registered">
              <p className="mb-3">Check these records before continuing.</p>
              <DuplicateCandidates candidates={hintMatches} />
            </Alert>
          )}
          {create.isError &&
            !(create.error instanceof ApiError && [400, 409].includes(create.error.status)) && (
              <Alert tone="danger">{errorMessage(create.error)}</Alert>
            )}
        </div>

        <PatientFields register={register} control={control} errors={formState.errors} />

        <FormSection
          title="Identification"
          description="Optional. An ID number stops the same person being registered twice."
        >
          <FormField label="ID type" optional span={3}>
            <Select value={idType} onChange={(e) => setIdType(e.target.value as typeof idType)}>
              <option value="">None</option>
              {IDENTIFIER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {IDENTIFIER_LABELS[t]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="ID number" optional span={3}>
            <TextField
              autoComplete="off"
              disabled={!idType}
              value={idValue}
              onChange={(e) => setIdValue(e.target.value)}
            />
          </FormField>
        </FormSection>
      </PatientFormShell>

      <ConfirmDialog
        open={!!pendingDuplicates}
        onOpenChange={(open) => !open && setPendingDuplicates(null)}
        title="Possible duplicate patient"
        description="These registered patients look similar. Register a new record only if you are sure this is a different person."
        confirmLabel="Register as new patient"
        loading={create.isPending}
        requireAcknowledgement="I have checked the existing records and this is a different person."
        onConfirm={() => {
          const values = createPatientSchema.safeParse({
            ...getValues(),
            identifiers,
            confirmNotDuplicate: true,
          });
          if (values.success)
            create.mutate(values.data, { onSettled: () => setPendingDuplicates(null) });
        }}
      >
        {pendingDuplicates && <DuplicateCandidates candidates={pendingDuplicates} />}
      </ConfirmDialog>
    </Page>
  );
}
