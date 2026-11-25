import {
  ENCOUNTER_STATUSES,
  ENCOUNTER_STATUS_LABELS,
  type EncounterView,
  type Page as PageOf,
} from '@lumen/contracts';
import {
  Button,
  DataTable,
  EmptyState,
  FilterBar,
  FilterSelect,
  TableToolbar,
  type Column,
} from '@lumen/ui';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Page, PageHeader } from '../../components/page';
import { PatientCell } from '../../components/patient-banner';
import { EncounterStatusBadge } from '../../components/status';
import { api } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import { useRequiredSession } from '../../lib/session';
import { useTableState } from '../../lib/table-state';

type ConsultationSort = 'startedAt';
const TABLE = {
  sorts: ['startedAt'] as const,
  defaultSort: () => ({ sort: 'startedAt' as const, order: 'desc' as const }),
  filters: ['status', 'mine'] as const,
};

export function ConsultationsPage() {
  const session = useRequiredSession();
  const navigate = useNavigate();
  const tz = session.organization.timezone;
  const isClinician = session.role === 'CLINICIAN';
  const { state, update, activeFilterCount } = useTableState<ConsultationSort>(TABLE);
  // Clinicians start on their own patients; anyone can widen it.
  const mineFilter = state.filters.mine ?? '';
  const mine = mineFilter === '' ? (isClinician ? 'true' : '') : mineFilter;
  const statusFilter = state.filters.status ?? '';
  const status = statusFilter === '' ? 'IN_PROGRESS' : statusFilter === 'any' ? '' : statusFilter;

  const params = {
    status,
    mine: mine === 'true' ? 'true' : undefined,
    order: state.order,
    page: state.page,
    pageSize: state.pageSize,
  };
  const query = useQuery({
    queryKey: ['encounters', session.branch.id, params],
    queryFn: () => api.get<PageOf<EncounterView>>('/encounters', params),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
  const data = query.data;
  useEffect(() => {
    if (data && !query.isPlaceholderData && state.page > data.totalPages)
      update({ page: data.totalPages }, { replace: true });
  }, [data, query.isPlaceholderData, state.page, update]);

  const columns: Column<EncounterView>[] = [
    {
      id: 'patient',
      header: 'Patient',
      mobile: 'title',
      cell: (e) => <PatientCell patient={e.patient} to={`/encounters/${e.id}`} />,
    },
    {
      id: 'started',
      header: 'Started',
      sortKey: 'startedAt',
      firstDirection: 'desc',
      mobile: 'meta',
      className: 'whitespace-nowrap',
      cell: (e) => <span className="data text-ink-700">{formatDateTime(e.startedAt, tz)}</span>,
    },
    {
      id: 'clinician',
      header: 'Clinician',
      showFrom: 'md',
      mobile: 'meta',
      className: 'whitespace-nowrap',
      cell: (e) => (
        <span className="text-ink-700">
          {e.attending.userId === session.user.id ? 'You' : e.attending.fullName}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      mobile: 'meta',
      cell: (e) => <EncounterStatusBadge status={e.status} />,
    },
  ];
  const reset = () => update({ filters: { status: 'any', mine: 'all' } }, { resetPage: true });

  return (
    <Page>
      <PageHeader
        eyebrow="Clinical"
        title="Consultations"
        description={
          data
            ? `${data.total} ${data.total === 1 ? 'encounter' : 'encounters'} at this branch`
            : 'Encounters at this branch'
        }
      />
      <DataTable
        caption="Consultations"
        columns={columns}
        rows={data?.items}
        rowKey={(e) => e.id}
        loading={query.isLoading}
        refreshing={query.isPlaceholderData}
        error={
          query.isError
            ? {
                title: 'Consultations could not be loaded',
                message: 'Check your connection and try again.',
                onRetry: () => void query.refetch(),
              }
            : null
        }
        sort={{ key: 'startedAt', direction: state.order }}
        onSortChange={(s) => update({ order: s.direction }, { resetPage: true })}
        onRowClick={(e) => navigate(`/encounters/${e.id}`)}
        toolbar={
          <TableToolbar>
            <FilterBar activeCount={activeFilterCount} onClear={reset}>
              <FilterSelect
                label="Status"
                allLabel="In progress"
                value={state.filters.status ?? ''}
                onChange={(v) => update({ filters: { status: v } }, { resetPage: true })}
                options={[
                  { value: 'any', label: 'Any status' },
                  ...ENCOUNTER_STATUSES.filter((s) => s !== 'IN_PROGRESS').map((s) => ({
                    value: s,
                    label: ENCOUNTER_STATUS_LABELS[s],
                  })),
                ]}
              />
              <FilterSelect
                label="Clinician"
                allLabel={isClinician ? 'My patients' : 'All clinicians'}
                value={state.filters.mine ?? ''}
                onChange={(v) => update({ filters: { mine: v } }, { resetPage: true })}
                options={
                  isClinician
                    ? [{ value: 'all', label: 'All clinicians' }]
                    : [{ value: 'true', label: 'My patients' }]
                }
              />
            </FilterBar>
          </TableToolbar>
        }
        empty={
          <EmptyState
            title="No consultations match"
            description="Start one from the waiting list on the Today page, or widen the filters."
            action={activeFilterCount ? <Button onClick={reset}>Show all</Button> : undefined}
          />
        }
        pagination={
          data
            ? {
                page: data.page,
                pageSize: data.pageSize,
                total: data.total,
                totalPages: data.totalPages,
                itemLabel: 'consultations',
                onPageChange: (page) => update({ page }),
                onPageSizeChange: (pageSize) => update({ pageSize }, { resetPage: true }),
              }
            : undefined
        }
      />
    </Page>
  );
}
