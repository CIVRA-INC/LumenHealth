import {
  IDENTIFIER_LABELS,
  SEX_LABELS,
  type AppointmentView,
  type EncounterListItem,
  type Page as PageOf,
  type PatientDetail,
} from '@lumen/contracts';
import {
  Alert,
  Button,
  buttonVariants,
  DataTable,
  DefinitionList,
  EmptyState,
  ErrorState,
  RecordSection,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  type Column,
} from '@lumen/ui';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { TopbarCrumbs } from '../../app/topbar';
import { Page, PageHeader } from '../../components/page';
import { PatientBanner } from '../../components/patient-banner';
import { AppointmentStatusBadge, EncounterStatusBadge } from '../../components/status';
import { ApiError, api } from '../../lib/api';
import { formatDate, formatDateOnly, formatDateTime } from '../../lib/format';
import { useCan, useRequiredSession } from '../../lib/session';
import { BookAppointmentDialog, WalkInDialog } from '../scheduling/booking-dialogs';

function VisitsTab({ patientId }: { patientId: string }) {
  const tz = useRequiredSession().organization.timezone;
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['patient', patientId, 'encounters'],
    queryFn: () => api.get<EncounterListItem[]>(`/patients/${patientId}/encounters`),
  });
  const columns: Column<EncounterListItem>[] = [
    {
      id: 'date',
      header: 'Date',
      mobile: 'title',
      className: 'whitespace-nowrap',
      cell: (e) => (
        <Link
          to={`/encounters/${e.id}`}
          onClick={(ev) => ev.stopPropagation()}
          className="data font-medium text-ink-950 hover:underline"
        >
          {formatDateTime(e.startedAt, tz)}
        </Link>
      ),
    },
    {
      id: 'dx',
      header: 'Primary diagnosis',
      mobile: 'meta',
      cell: (e) => (
        <span className="block max-w-[28rem] truncate text-ink-900">
          {e.primaryDiagnosis ?? <span className="text-ink-400">Not recorded</span>}
        </span>
      ),
    },
    {
      id: 'clinician',
      header: 'Clinician',
      showFrom: 'md',
      mobile: 'meta',
      cell: (e) => <span className="text-ink-700">{e.attending.fullName}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      mobile: 'meta',
      cell: (e) => <EncounterStatusBadge status={e.status} />,
    },
  ];
  return (
    <DataTable
      caption="Consultations"
      columns={columns}
      rows={data}
      rowKey={(e) => e.id}
      loading={isLoading}
      skeletonRows={3}
      error={
        isError
          ? { title: 'Consultations could not be loaded', onRetry: () => void refetch() }
          : null
      }
      onRowClick={(e) => navigate(`/encounters/${e.id}`)}
      empty={
        <EmptyState
          title="No consultations yet"
          description="Encounters appear here once the patient has been seen."
          className="py-8"
        />
      }
    />
  );
}

function AppointmentsTab({ patientId }: { patientId: string }) {
  const tz = useRequiredSession().organization.timezone;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { data, isLoading, isError, refetch, isPlaceholderData } = useQuery({
    queryKey: ['appointments', 'patient', patientId, page, pageSize],
    queryFn: () => api.get<PageOf<AppointmentView>>('/appointments', { patientId, page, pageSize }),
    placeholderData: keepPreviousData,
  });
  const columns: Column<AppointmentView>[] = [
    {
      id: 'when',
      header: 'When',
      mobile: 'title',
      className: 'whitespace-nowrap',
      cell: (a) => (
        <span className="data font-medium text-ink-950">
          {formatDateTime(a.scheduledStart, tz)}
        </span>
      ),
    },
    {
      id: 'reason',
      header: 'Reason',
      mobile: 'meta',
      cell: (a) => (
        <span className="block max-w-[28rem] truncate text-ink-800">{a.reason ?? '—'}</span>
      ),
    },
    {
      id: 'clinician',
      header: 'Clinician',
      showFrom: 'md',
      mobile: 'meta',
      cell: (a) => <span className="text-ink-700">{a.clinician?.fullName ?? '—'}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      mobile: 'meta',
      cell: (a) => <AppointmentStatusBadge status={a.status} />,
    },
  ];
  return (
    <DataTable
      caption="Appointments"
      columns={columns}
      rows={data?.items}
      rowKey={(a) => a.id}
      loading={isLoading}
      refreshing={isPlaceholderData}
      skeletonRows={3}
      error={
        isError
          ? { title: 'Appointments could not be loaded', onRetry: () => void refetch() }
          : null
      }
      empty={
        <EmptyState
          title="No appointments"
          description="Booked appointments and walk-ins appear here."
          className="py-8"
        />
      }
      pagination={
        data
          ? {
              page: data.page,
              pageSize: data.pageSize,
              total: data.total,
              totalPages: data.totalPages,
              itemLabel: 'appointments',
              onPageChange: setPage,
              onPageSizeChange: (n) => (setPageSize(n), setPage(1)),
            }
          : undefined
      }
    />
  );
}

function Overview({ patient, timezone }: { patient: PatientDetail; timezone: string }) {
  const address = patient.address
    ? [patient.address.line1, patient.address.city, patient.address.state]
        .filter(Boolean)
        .join(', ')
    : null;
  return (
    <div>
      <RecordSection title="Identity">
        <DefinitionList
          className="max-w-xl"
          items={[
            {
              label: 'Full name',
              value: [patient.givenName, patient.middleName, patient.familyName]
                .filter(Boolean)
                .join(' '),
            },
            {
              label: 'Date of birth',
              value: <span className="data">{formatDateOnly(patient.dateOfBirth)}</span>,
            },
            { label: 'Sex', value: SEX_LABELS[patient.sex] },
            { label: 'MRN', value: <span className="data font-medium">{patient.mrn}</span> },
            ...patient.identifiers.map((i) => ({
              label: IDENTIFIER_LABELS[i.type],
              value: <span className="data">{i.value}</span>,
            })),
            {
              label: 'Registered',
              value: <span className="data">{formatDate(patient.registeredAt, timezone)}</span>,
            },
          ]}
        />
      </RecordSection>
      <RecordSection title="Contact">
        <DefinitionList
          className="max-w-xl"
          items={[
            { label: 'Phone', value: <span className="data">{patient.phone}</span> },
            { label: 'Email', value: patient.email },
            { label: 'Address', value: address },
          ]}
        />
      </RecordSection>
      <RecordSection title="Emergency contact">
        {patient.emergencyContacts.length === 0 ? (
          <p className="text-base text-ink-500">None on file.</p>
        ) : (
          <ul className="max-w-xl space-y-3">
            {patient.emergencyContacts.map((c) => (
              <li key={c.id} className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 text-base">
                <span className="text-sm text-ink-500">{c.relationship}</span>
                <span>
                  <span className="font-medium text-ink-950">{c.name}</span>
                  <span className="data ml-3 text-ink-600">{c.phone}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </RecordSection>
    </div>
  );
}

export function PatientDetailPage() {
  const { patientId = '' } = useParams();
  const session = useRequiredSession();
  const location = useLocation();
  const flash = location.state as { justRegistered?: boolean; updated?: boolean } | null;
  const canEdit = useCan('patients.write');
  const canBook = useCan('appointments.write');
  const canWalkIn = useCan('queue.manage');
  const canSeeVisits = useCan('encounters.read');
  const [bookOpen, setBookOpen] = useState(false);
  const [walkInOpen, setWalkInOpen] = useState(false);

  const {
    data: patient,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => api.get<PatientDetail>(`/patients/${patientId}`),
    retry: (count, err) => !(err instanceof ApiError) && count < 2,
  });

  if (error instanceof ApiError && error.status === 404) {
    return (
      <Page width="document">
        <PageHeader
          title="Patient not found"
          crumbs={[{ label: 'Patients', to: '/patients' }, { label: 'Not found' }]}
        />
        <EmptyState
          title="This record isn’t available"
          description="It may not exist, or it belongs to another organisation."
          action={
            <Link to="/patients" className={buttonVariants()}>
              Back to patients
            </Link>
          }
        />
      </Page>
    );
  }
  if (error) {
    return (
      <Page width="document">
        <PageHeader
          title="Patient"
          crumbs={[{ label: 'Patients', to: '/patients' }, { label: 'Patient' }]}
        />
        <ErrorState title="The patient record could not be loaded" onRetry={() => void refetch()} />
      </Page>
    );
  }

  return (
    <Page width="document">
      {isLoading || !patient ? (
        <>
          <PageHeader
            title="Patient"
            crumbs={[{ label: 'Patients', to: '/patients' }, { label: '…' }]}
          />
          <Skeleton className="h-64" />
        </>
      ) : (
        <>
          <TopbarCrumbs crumbs={[{ label: 'Patients', to: '/patients' }, { label: patient.mrn }]} />
          {flash?.justRegistered && (
            <Alert
              tone="success"
              title={`${patient.givenName} ${patient.familyName} registered as ${patient.mrn}`}
              className="mb-5"
            >
              <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
                Next step:
                {canWalkIn && (
                  <Button size="sm" variant="primary" onClick={() => setWalkInOpen(true)}>
                    Add to today’s queue
                  </Button>
                )}
                {canBook && (
                  <Button size="sm" onClick={() => setBookOpen(true)}>
                    Book an appointment
                  </Button>
                )}
              </span>
            </Alert>
          )}
          {flash?.updated && (
            <Alert tone="success" className="mb-5">
              Patient details saved.
            </Alert>
          )}
          <PatientBanner
            as="h1"
            patient={patient}
            trailing={
              <>
                {canEdit && (
                  <Link
                    to={`/patients/${patient.id}/edit`}
                    className={buttonVariants({ variant: 'secondary' })}
                  >
                    Edit details
                  </Link>
                )}
                {canBook && <Button onClick={() => setBookOpen(true)}>Book appointment</Button>}
                {canWalkIn && (
                  <Button variant="primary" onClick={() => setWalkInOpen(true)}>
                    Add to queue
                  </Button>
                )}
              </>
            }
          />

          <Tabs defaultValue="overview" className="mt-6">
            <TabsList>
              <TabsTrigger value="overview">Record</TabsTrigger>
              {canSeeVisits && <TabsTrigger value="visits">Consultations</TabsTrigger>}
              <TabsTrigger value="appointments">Appointments</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="pt-6">
              <Overview patient={patient} timezone={session.organization.timezone} />
            </TabsContent>
            {canSeeVisits && (
              <TabsContent value="visits">
                <VisitsTab patientId={patient.id} />
              </TabsContent>
            )}
            <TabsContent value="appointments">
              <AppointmentsTab patientId={patient.id} />
            </TabsContent>
          </Tabs>

          <BookAppointmentDialog open={bookOpen} onOpenChange={setBookOpen} patient={patient} />
          <WalkInDialog open={walkInOpen} onOpenChange={setWalkInOpen} patient={patient} />
        </>
      )}
    </Page>
  );
}
