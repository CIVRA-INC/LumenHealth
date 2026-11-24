import { zodResolver } from '@hookform/resolvers/zod';
import {
  createPatientSchema,
  ERROR_CODES,
  type CreatePatientInput,
  type CreatePatientParsed,
  type PatientDetail,
} from '@lumen/contracts';
import { Alert, Button, ErrorState, Skeleton } from '@lumen/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
import { Page, PageHeader } from '../../components/page';
import { ApiError, api } from '../../lib/api';
import { errorMessage } from '../../lib/errors';
import { PatientFields } from './patient-fields';
import { PatientFormShell } from './patient-form-shell';

function toDefaults(p: PatientDetail): CreatePatientInput {
  return {
    givenName: p.givenName,
    middleName: p.middleName ?? '',
    familyName: p.familyName,
    dateOfBirth: p.dateOfBirth,
    sex: p.sex,
    phone: p.phone,
    email: p.email ?? undefined,
    address: p.address
      ? {
          line1: p.address.line1,
          city: p.address.city,
          state: p.address.state,
          country: p.address.country,
        }
      : undefined,
    identifiers: [],
    emergencyContacts: p.emergencyContacts.map((c) => ({
      name: c.name,
      relationship: c.relationship,
      phone: c.phone,
    })),
  };
}

function EditForm({ patient }: { patient: PatientDetail }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const saved = useRef(false);
  const form = useForm<CreatePatientInput, unknown, CreatePatientParsed>({
    resolver: zodResolver(createPatientSchema),
    mode: 'onBlur',
    defaultValues: toDefaults(patient),
  });

  const save = useMutation({
    mutationFn: (v: CreatePatientParsed) => {
      const hasAddress = v.address && (v.address.line1 || v.address.city || v.address.state);
      return api.patch<PatientDetail>(`/patients/${patient.id}`, {
        version: patient.version,
        givenName: v.givenName,
        middleName: v.middleName || null,
        familyName: v.familyName,
        dateOfBirth: v.dateOfBirth,
        sex: v.sex,
        phone: v.phone,
        email: v.email || null,
        address: hasAddress ? v.address : null,
        emergencyContacts: v.emergencyContacts,
      });
    },
    onSuccess: async () => {
      saved.current = true;
      await client.invalidateQueries({ queryKey: ['patients'] });
      await client.invalidateQueries({ queryKey: ['patient', patient.id] });
      navigate(`/patients/${patient.id}`, { state: { updated: true } });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 400) {
        for (const [path, message] of Object.entries(error.fieldErrors))
          form.setError(path as keyof CreatePatientInput, { message });
      }
    },
  });

  const stale = save.error instanceof ApiError && save.error.code === ERROR_CODES.staleVersion;

  return (
    <PatientFormShell
      dirty={form.formState.isDirty}
      savedRef={saved}
      saving={save.isPending}
      submitLabel="Save changes"
      cancelTo={`/patients/${patient.id}`}
      onSubmit={() => void form.handleSubmit((v) => save.mutate(v))()}
    >
      {save.isError && (
        <Alert
          tone={stale ? 'warning' : 'danger'}
          title={stale ? 'Someone else changed this record' : undefined}
          className="mb-6"
          action={
            stale ? (
              <Button
                size="sm"
                onClick={() =>
                  void client
                    .invalidateQueries({ queryKey: ['patient', patient.id] })
                    .then(() => navigate(`/patients/${patient.id}`))
                }
              >
                Discard my changes and reload
              </Button>
            ) : undefined
          }
        >
          {stale
            ? 'Your edits have not been saved. Reload the record to see the latest version.'
            : errorMessage(save.error)}
        </Alert>
      )}
      <PatientFields
        register={form.register}
        control={form.control}
        errors={form.formState.errors}
      />
    </PatientFormShell>
  );
}

export function PatientEditPage() {
  const { patientId = '' } = useParams();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => api.get<PatientDetail>(`/patients/${patientId}`),
  });

  return (
    <Page width="form">
      <PageHeader
        title="Edit patient"
        description={data ? `${data.displayName} · ${data.mrn}` : undefined}
        crumbs={[
          { label: 'Patients', to: '/patients' },
          { label: data?.displayName ?? '…', to: `/patients/${patientId}` },
          { label: 'Edit' },
        ]}
      />
      {isError ? (
        <ErrorState title="This record could not be loaded" onRetry={() => void refetch()} />
      ) : isLoading || !data ? (
        <Skeleton className="h-96" />
      ) : (
        <EditForm patient={data} />
      )}
    </Page>
  );
}
