import type { Page as PageOf } from '@lumen/contracts';
import {
  Button,
  DataTable,
  EmptyState,
  FilterBar,
  FilterSelect,
  StatusIndicator,
  TableToolbar,
  type Column,
} from '@lumen/ui';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Link } from 'react-router';
import { Page, PageHeader } from '../../components/page';
import { api } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import { useCan, useRequiredSession } from '../../lib/session';
import { useTableState } from '../../lib/table-state';

interface AuditEventView {
  id: string;
  occurredAt: string;
  action: string;
  outcome: 'SUCCESS' | 'DENIED' | 'FAILURE';
  resourceType: string;
  resourceId: string | null;
  patientId: string | null;
  actor: { userId: string; fullName: string } | null;
  ipAddress: string | null;
}

/** Plain-language descriptions of recorded actions. The exact code is always shown beneath. */
const ACTIONS: Record<string, string> = {
  'auth.login': 'Signed in',
  'auth.logout': 'Signed out',
  'auth.switch_context': 'Changed branch or organisation',
  'auth.change_password': 'Changed password',
  'access.denied': 'Was refused access',
  'patient.create': 'Registered a patient',
  'patient.read': 'Opened a patient record',
  'patient.update': 'Edited a patient record',
  'patient.search': 'Searched the patient registry',
  'patient.duplicate_check': 'Checked for duplicate patients',
  'patient.history.read': 'Viewed a patient’s consultations',
  'appointment.create': 'Booked an appointment',
  'appointment.walk_in': 'Added a walk-in to the queue',
  'appointment.check_in': 'Checked a patient in',
  'appointment.cancel': 'Cancelled an appointment',
  'appointment.no_show': 'Marked an appointment as not attended',
  'encounter.start': 'Started a consultation',
  'encounter.read': 'Opened an encounter',
  'encounter.note.save': 'Saved a consultation note',
  'encounter.vitals.record': 'Recorded vitals',
  'encounter.vitals.void': 'Marked vitals as entered in error',
  'encounter.diagnosis.add': 'Added a diagnosis',
  'encounter.diagnosis.remove': 'Removed a draft diagnosis',
  'encounter.order.add': 'Added a medication order',
  'encounter.order.remove': 'Removed a draft medication order',
  'encounter.order.cancel': 'Cancelled a medication order',
  'encounter.finalize': 'Signed an encounter',
  'encounter.close': 'Closed an encounter',
  'encounter.void': 'Marked an encounter as entered in error',
  'encounter.addendum.add': 'Added an addendum',
  'user.create': 'Added a staff member',
  'user.update': 'Changed a staff member',
  'branch.create': 'Added a branch',
  'department.create': 'Added a department',
};

const GROUPS = [
  { value: 'patient.', label: 'Patient records' },
  { value: 'encounter.', label: 'Encounters' },
  { value: 'appointment.', label: 'Appointments' },
  { value: 'auth.', label: 'Sign-ins and sessions' },
  { value: 'user.', label: 'Staff changes' },
];
const OUTCOMES = [
  { value: 'SUCCESS', label: 'Allowed' },
  { value: 'DENIED', label: 'Refused' },
  { value: 'FAILURE', label: 'Failed' },
];
type AuditSort = 'time';
const TABLE = {
  sorts: ['time'] as const,
  defaultSort: () => ({ sort: 'time' as const, order: 'desc' as const }),
  filters: ['action', 'outcome'] as const,
  pageSizes: [50, 25, 100] as const,
  compactPageSize: 25,
};

export function AuditPage() {
  const tz = useRequiredSession().organization.timezone;
  const canOpenPatients = useCan('patients.read');
  const { state, update, activeFilterCount } = useTableState<AuditSort>(TABLE);
  const params = {
    action: state.filters.action,
    outcome: state.filters.outcome,
    order: state.order,
    page: state.page,
    pageSize: state.pageSize,
  };
  const query = useQuery({
    queryKey: ['audit', params],
    queryFn: () => api.get<PageOf<AuditEventView>>('/audit-events', params),
    placeholderData: keepPreviousData,
  });
  const data = query.data;
  useEffect(() => {
    if (data && !query.isPlaceholderData && state.page > data.totalPages)
      update({ page: data.totalPages }, { replace: true });
  }, [data, query.isPlaceholderData, state.page, update]);

  const columns: Column<AuditEventView>[] = [
    {
      id: 'time',
      header: 'Time',
      sortKey: 'time',
      firstDirection: 'desc',
      mobile: 'meta',
      className: 'w-44 whitespace-nowrap',
      cell: (e) => <span className="data text-ink-700">{formatDateTime(e.occurredAt, tz)}</span>,
    },
    {
      id: 'person',
      header: 'Person',
      showFrom: 'md',
      mobile: 'meta',
      className: 'whitespace-nowrap',
      cell: (e) => (
        <span className="text-ink-900">
          {e.actor?.fullName ?? <span className="text-ink-400">Not signed in</span>}
        </span>
      ),
    },
    {
      id: 'action',
      header: 'Action',
      mobile: 'title',
      cell: (e) => (
        <div className="min-w-0">
          <p className="text-ink-950">{ACTIONS[e.action] ?? e.action}</p>
          <p className="data truncate text-xs text-ink-500">{e.action}</p>
        </div>
      ),
    },
    {
      id: 'record',
      header: 'Record',
      showFrom: 'lg',
      mobile: 'hidden',
      cell: (e) =>
        e.patientId && canOpenPatients ? (
          <Link to={`/patients/${e.patientId}`} className="data text-green-700 hover:underline">
            Patient …{e.patientId.slice(-6)}
          </Link>
        ) : e.resourceId ? (
          <span className="data text-xs text-ink-600">
            {e.resourceType} …{e.resourceId.slice(-6)}
          </span>
        ) : (
          <span className="text-ink-400">–</span>
        ),
    },
    {
      id: 'result',
      header: 'Result',
      mobile: 'meta',
      cell: (e) => (
        <StatusIndicator
          tone={e.outcome === 'SUCCESS' ? 'neutral' : e.outcome === 'DENIED' ? 'warning' : 'danger'}
        >
          {e.outcome === 'SUCCESS' ? 'Allowed' : e.outcome === 'DENIED' ? 'Refused' : 'Failed'}
        </StatusIndicator>
      ),
    },
  ];

  return (
    <Page>
      <PageHeader
        eyebrow="Administration"
        title="Audit log"
        description="Who accessed or changed what, and when. Entries cannot be edited or deleted."
      />
      <DataTable
        caption="Audit events"
        columns={columns}
        rows={data?.items}
        rowKey={(e) => e.id}
        loading={query.isLoading}
        refreshing={query.isPlaceholderData}
        error={
          query.isError
            ? {
                title: 'The audit log could not be loaded',
                message: 'Check your connection and try again.',
                onRetry: () => void query.refetch(),
              }
            : null
        }
        sort={{ key: 'time', direction: state.order }}
        onSortChange={(s) => update({ order: s.direction }, { resetPage: true })}
        toolbar={
          <TableToolbar>
            <FilterBar
              activeCount={activeFilterCount}
              onClear={() => update({ filters: { action: '', outcome: '' } }, { resetPage: true })}
            >
              <FilterSelect
                label="Activity"
                allLabel="All activity"
                value={state.filters.action ?? ''}
                onChange={(action) => update({ filters: { action } }, { resetPage: true })}
                options={GROUPS}
              />
              <FilterSelect
                label="Result"
                allLabel="Any result"
                value={state.filters.outcome ?? ''}
                onChange={(outcome) => update({ filters: { outcome } }, { resetPage: true })}
                options={OUTCOMES}
              />
            </FilterBar>
          </TableToolbar>
        }
        empty={
          <EmptyState
            title="No matching activity"
            description="Change or clear the filters."
            action={
              activeFilterCount ? (
                <Button
                  onClick={() =>
                    update({ filters: { action: '', outcome: '' } }, { resetPage: true })
                  }
                >
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        }
        pagination={
          data
            ? {
                page: data.page,
                pageSize: data.pageSize,
                total: data.total,
                totalPages: data.totalPages,
                itemLabel: 'events',
                pageSizeOptions: [25, 50, 100],
                onPageChange: (page) => update({ page }),
                onPageSizeChange: (pageSize) => update({ pageSize }, { resetPage: true }),
              }
            : undefined
        }
      />
    </Page>
  );
}
