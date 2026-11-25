import {
  PATIENT_SORTS,
  SEX_LABELS,
  type Page as PageOf,
  type PatientSummary,
} from '@lumen/contracts';
import {
  Button,
  DataTable,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  IconButton,
  Kbd,
  SearchField,
  TableToolbar,
  buttonVariants,
  type Column,
} from '@lumen/ui';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { MoreHorizontal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Highlight } from '../../components/highlight';
import { Page, PageHeader } from '../../components/page';
import { api } from '../../lib/api';
import { ageLabel, formatDate, formatDateOnly } from '../../lib/format';
import { useCan, useRequiredSession } from '../../lib/session';
import { useTableState } from '../../lib/table-state';
import { useSearchInput } from '../../lib/use-search-input';
import { BookAppointmentDialog, WalkInDialog } from '../scheduling/booking-dialogs';

type PatientSort = (typeof PATIENT_SORTS)[number];
type RegistryRow = PatientSummary;

const TABLE = {
  sorts: PATIENT_SORTS,
  defaultSort: (hasQuery: boolean) =>
    hasQuery
      ? { sort: 'name' as const, order: 'asc' as const }
      : { sort: 'registered' as const, order: 'desc' as const },
};

export function PatientListPage() {
  const navigate = useNavigate();
  const canRegister = useCan('patients.write');
  const canWalkIn = useCan('queue.manage');
  const canBook = useCan('appointments.write');
  const tz = useRequiredSession().organization.timezone;
  const { state, update } = useTableState<PatientSort>(TABLE);
  const [text, setText] = useSearchInput(state.q, (q) =>
    update({ q }, { resetPage: true, replace: true }),
  );
  const searchBox = useRef<HTMLInputElement>(null);
  const [action, setAction] = useState<{
    kind: 'walk-in' | 'book';
    patient: PatientSummary;
  } | null>(null);

  // "/" jumps to search from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
        e.preventDefault();
        searchBox.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const query = useQuery({
    queryKey: [
      'patients',
      {
        q: state.q.trim(),
        page: state.page,
        pageSize: state.pageSize,
        sort: state.sort,
        order: state.order,
      },
    ],
    queryFn: () =>
      api.get<PageOf<RegistryRow>>('/patients', {
        q: state.q.trim(),
        page: state.page,
        pageSize: state.pageSize,
        sort: state.sort,
        order: state.order,
      }),
    placeholderData: keepPreviousData,
  });
  const data = query.data;

  // A page past the end (a stale link, or rows removed meanwhile) moves to the last real page.
  useEffect(() => {
    if (data && !query.isPlaceholderData && state.page > data.totalPages)
      update({ page: data.totalPages }, { replace: true });
  }, [data, query.isPlaceholderData, state.page, update]);

  const q = state.q.trim();
  const columns: Column<RegistryRow>[] = [
    {
      id: 'patient',
      header: 'Patient',
      sortKey: 'name',
      mobile: 'title',
      // The widest column: it takes the room the others do not need, and a long name wraps to a second
      // line (the full name is also the link's tooltip) rather than being cut off at a fixed width.
      width: 'w-[38%] min-w-[15rem]',
      cell: (p) => (
        <Link
          to={`/patients/${p.id}`}
          onClick={(e) => e.stopPropagation()}
          className="line-clamp-2 font-medium break-words text-ink-950 hover:underline"
          title={p.displayName}
        >
          <Highlight text={p.displayName} query={q} />
        </Link>
      ),
    },
    {
      id: 'mrn',
      header: 'MRN',
      sortKey: 'mrn',
      mobile: 'meta',
      width: 'w-32',
      className: 'whitespace-nowrap',
      cell: (p) => (
        <span className="data text-ink-700">
          <Highlight text={p.mrn} query={q} />
        </span>
      ),
    },
    {
      id: 'age',
      width: 'w-32',
      header: 'Age and sex',
      showFrom: 'lg',
      mobile: 'meta',
      className: 'whitespace-nowrap',
      cell: (p) => (
        <span className="text-ink-700">
          {ageLabel(p.dateOfBirth)}, {SEX_LABELS[p.sex].toLowerCase()}
        </span>
      ),
    },
    {
      id: 'dob',
      width: 'w-32',
      header: 'Date of birth',
      sortKey: 'dateOfBirth',
      showFrom: 'lg',
      mobile: 'hidden',
      className: 'whitespace-nowrap',
      cell: (p) => <span className="data text-ink-600">{formatDateOnly(p.dateOfBirth)}</span>,
    },
    {
      id: 'phone',
      width: 'w-36',
      header: 'Phone',
      showFrom: 'md',
      mobile: 'meta',
      className: 'whitespace-nowrap',
      cell: (p) => (
        <span className="data text-ink-600">
          <Highlight text={p.phone} query={q} />
        </span>
      ),
    },
    {
      id: 'registered',
      width: 'w-32',
      header: 'Registered',
      sortKey: 'registered',
      firstDirection: 'desc',
      align: 'right',
      showFrom: 'xl',
      mobile: 'hidden',
      className: 'whitespace-nowrap',
      cell: (p) => <span className="data text-ink-500">{formatDate(p.registeredAt, tz)}</span>,
    },
  ];

  return (
    <Page>
      <PageHeader
        eyebrow="Registry"
        title="Patients"
        description={
          data
            ? `${data.total.toLocaleString('en-GB')} ${q ? (data.total === 1 ? 'match' : 'matches') : 'registered patients'}`
            : undefined
        }
        actions={
          canRegister && (
            <Link to="/patients/new" className={buttonVariants({ variant: 'primary' })}>
              Register patient
            </Link>
          )
        }
      />
      <DataTable
        caption="Patients"
        columns={columns}
        rows={data?.items}
        rowKey={(p) => p.id}
        loading={query.isLoading}
        refreshing={query.isPlaceholderData}
        error={
          query.isError
            ? {
                title: 'Patients could not be loaded',
                message: 'Check your connection and try again.',
                onRetry: () => void query.refetch(),
              }
            : null
        }
        sort={{ key: state.sort, direction: state.order }}
        onSortChange={(s) =>
          update({ sort: s.key as PatientSort, order: s.direction }, { resetPage: true })
        }
        onRowClick={(p) => navigate(`/patients/${p.id}`)}
        toolbar={
          <TableToolbar>
            <SearchField
              inputRef={searchBox}
              value={text}
              onValueChange={setText}
              label="Search patients"
              placeholder="Name, MRN or phone number"
              hint={<Kbd>/</Kbd>}
              className="min-w-0 basis-full sm:max-w-md sm:flex-1 sm:basis-auto"
            />
          </TableToolbar>
        }
        quietActions
        rowActions={
          canWalkIn || canBook
            ? (p) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <IconButton label={`Actions for ${p.displayName}`} size="sm">
                      <MoreHorizontal />
                    </IconButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => navigate(`/patients/${p.id}`)}>
                      Open record
                    </DropdownMenuItem>
                    {canWalkIn && (
                      <DropdownMenuItem onSelect={() => setAction({ kind: 'walk-in', patient: p })}>
                        Add to today’s queue
                      </DropdownMenuItem>
                    )}
                    {canBook && (
                      <DropdownMenuItem onSelect={() => setAction({ kind: 'book', patient: p })}>
                        Book appointment
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            : undefined
        }
        empty={
          <EmptyState
            title={q ? `No patients match “${q}”` : 'No patients registered yet'}
            description={
              q
                ? 'Try the medical record number, the phone number, or fewer letters of the name.'
                : 'Register the first patient to start the registry.'
            }
            action={
              q ? (
                <Button
                  onClick={() => {
                    setText('');
                    update({ q: '' }, { resetPage: true });
                  }}
                >
                  Clear search
                </Button>
              ) : canRegister ? (
                <Link to="/patients/new" className={buttonVariants({ variant: 'primary' })}>
                  Register patient
                </Link>
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
                itemLabel: data.total === 1 ? 'patient' : 'patients',
                onPageChange: (page) => update({ page }),
                onPageSizeChange: (pageSize) => update({ pageSize }, { resetPage: true }),
              }
            : undefined
        }
      />
      {action?.kind === 'walk-in' && (
        <WalkInDialog open onOpenChange={(o) => !o && setAction(null)} patient={action.patient} />
      )}
      {action?.kind === 'book' && (
        <BookAppointmentDialog
          open
          onOpenChange={(o) => !o && setAction(null)}
          patient={action.patient}
        />
      )}
    </Page>
  );
}
