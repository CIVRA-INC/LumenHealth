import {
  localDate,
  type AppointmentView,
  type Page as PageOf,
  type QueueView,
} from '@lumen/contracts';
import {
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  IconButton,
  SectionHeader,
  Skeleton,
  Tag,
  type Column,
} from '@lumen/ui';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { Page, PageHeader } from '../../components/page';
import { PatientCell } from '../../components/patient-banner';
import { AppointmentStatusBadge, PriorityBadge } from '../../components/status';
import { api } from '../../lib/api';
import { elapsedLabel, formatTime, minutesSince } from '../../lib/format';
import { useCan, useRequiredSession } from '../../lib/session';
import { AppointmentActions } from './appointment-actions';
import { BookAppointmentDialog, WalkInDialog } from './booking-dialogs';

const DAY_SIZE = 100;
const LONG_WAIT_MINUTES = 30;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function dayLabel(date: string, today: string): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const text = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)));
  return date === today
    ? `Today, ${text}`
    : date === shiftDate(today, 1)
      ? `Tomorrow, ${text}`
      : date === shiftDate(today, -1)
        ? `Yesterday, ${text}`
        : text;
}

function PatientWithTags({ a }: { a: AppointmentView }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <PatientCell patient={a.patient} />
      <PriorityBadge priority={a.priority} />
      {a.type === 'WALK_IN' && <Tag>Walk-in</Tag>}
    </div>
  );
}

const actions = (a: AppointmentView) => <AppointmentActions appt={a} />;

/** A group of the day's patients that share a workflow state. */
function Group({
  title,
  note,
  rows,
  columns,
  empty,
}: {
  title: string;
  note?: string;
  rows: AppointmentView[];
  columns: Column<AppointmentView>[];
  empty?: string;
}) {
  return (
    <section>
      <SectionHeader
        title={title}
        meta={rows.length}
        action={note ? <span className="text-xs text-ink-500">{note}</span> : undefined}
      />
      <DataTable
        bordered={false}
        caption={title}
        columns={columns}
        rows={rows}
        rowKey={(a) => a.id}
        rowActions={actions}
        empty={<EmptyState title={empty ?? 'No one here'} className="py-6" />}
      />
    </section>
  );
}

/**
 * The day's worklist, grouped by where each patient is. The date lives in the URL, so a day can be
 * bookmarked or shared. Today's waiting room comes from the live queue (urgent first).
 */
export function SchedulePage() {
  const session = useRequiredSession();
  const tz = session.organization.timezone;
  const today = localDate(tz);
  const [params, setParams] = useSearchParams();
  const dateParam = params.get('date');
  const date = dateParam && ISO_DATE.test(dateParam) ? dateParam : today;
  const setDate = (next: string) =>
    setParams(next === today ? {} : { date: next }, { replace: true });
  const isToday = date === today;
  const canBook = useCan('appointments.write');
  const canWalkIn = useCan('queue.manage');
  const [bookOpen, setBookOpen] = useState(false);
  const [walkInOpen, setWalkInOpen] = useState(false);

  const day = useQuery({
    queryKey: ['appointments', session.branch.id, { date, page: 1, size: DAY_SIZE }],
    queryFn: () => api.get<PageOf<AppointmentView>>('/appointments', { date, pageSize: DAY_SIZE }),
    placeholderData: keepPreviousData,
    refetchInterval: isToday ? 30_000 : false,
  });
  const queue = useQuery({
    queryKey: ['queue', session.branch.id],
    queryFn: () => api.get<QueueView>('/queue'),
    enabled: isToday,
    refetchInterval: 20_000,
  });

  const items = day.data?.items ?? [];
  const byStatus = (...statuses: AppointmentView['status'][]) =>
    items.filter((a) => statuses.includes(a.status));
  const waiting = isToday ? (queue.data?.waiting ?? []) : byStatus('CHECKED_IN');
  const withClinician = isToday ? (queue.data?.inConsultation ?? []) : byStatus('IN_CONSULTATION');
  const expected = byStatus('SCHEDULED');
  const finished = byStatus('COMPLETED', 'CANCELLED', 'NO_SHOW');
  const loading = day.isLoading || (isToday && queue.isLoading);
  const total = waiting.length + withClinician.length + expected.length + finished.length;

  const patient: Column<AppointmentView> = {
    id: 'patient',
    header: 'Patient',
    mobile: 'title',
    cell: (a) => <PatientWithTags a={a} />,
  };
  const clinician: Column<AppointmentView> = {
    id: 'clinician',
    header: 'Clinician',
    showFrom: 'md',
    mobile: 'meta',
    className: 'whitespace-nowrap',
    cell: (a) => (
      <span className="text-ink-700">
        {a.clinician?.fullName ?? <span className="text-ink-400">Any clinician</span>}
      </span>
    ),
  };
  const reason: Column<AppointmentView> = {
    id: 'reason',
    header: 'Reason',
    showFrom: 'lg',
    mobile: 'meta',
    cell: (a) => (
      <span className="block max-w-[26rem] truncate text-ink-700">{a.reason ?? '—'}</span>
    ),
  };
  const time = (label: string): Column<AppointmentView> => ({
    id: 'time',
    header: label,
    className: 'w-20',
    mobile: 'meta',
    cell: (a) => <span className="data text-ink-800">{formatTime(a.scheduledStart, tz)}</span>,
  });

  const waitingColumns: Column<AppointmentView>[] = [
    {
      id: 'no',
      header: 'No.',
      className: 'w-14',
      mobile: 'meta',
      cell: (a) => <span className="data text-ink-600">{a.ticketNumber}</span>,
    },
    patient,
    reason,
    {
      id: 'arrived',
      header: 'Arrived',
      align: 'right',
      showFrom: 'md',
      mobile: 'hidden',
      cell: (a) => (
        <span className="data text-ink-700">
          {a.checkedInAt ? formatTime(a.checkedInAt, tz) : '—'}
        </span>
      ),
    },
    {
      id: 'waiting',
      header: 'Waiting',
      align: 'right',
      mobile: 'meta',
      cell: (a) => (
        <span
          className={`data ${a.checkedInAt && minutesSince(a.checkedInAt) >= LONG_WAIT_MINUTES ? 'font-medium text-warning-700' : 'text-ink-700'}`}
        >
          {a.checkedInAt ? elapsedLabel(a.checkedInAt) : '—'}
        </span>
      ),
    },
  ];
  const expectedColumns: Column<AppointmentView>[] = [
    {
      id: 'time',
      header: 'Time',
      className: 'w-20',
      mobile: 'meta',
      cell: (a) => {
        const late =
          isToday &&
          new Date(a.scheduledStart) < new Date() &&
          minutesSince(a.scheduledStart) >= 15;
        return (
          <span className={`data ${late ? 'font-medium text-warning-700' : 'text-ink-800'}`}>
            {formatTime(a.scheduledStart, tz)}
          </span>
        );
      },
    },
    patient,
    clinician,
    reason,
  ];

  return (
    <Page>
      <PageHeader
        eyebrow={isToday ? 'Today' : (dayLabel(date, today).split(',')[0] ?? 'Day')}
        title="Schedule"
        description={dayLabel(date, today).replace(/^(Today|Tomorrow|Yesterday), /, '')}
        actions={
          <>
            <div className="flex items-center gap-1">
              <IconButton label="Previous day" onClick={() => setDate(shiftDate(date, -1))}>
                <ChevronLeft />
              </IconButton>
              <input
                type="date"
                aria-label="Show day"
                value={date}
                onChange={(e) =>
                  setDate(e.target.value && ISO_DATE.test(e.target.value) ? e.target.value : today)
                }
                className="data h-8 rounded-md border border-rule-strong bg-surface px-2 text-sm text-ink-950 hover:border-ink-300 pointer-coarse:h-11"
              />
              <IconButton label="Next day" onClick={() => setDate(shiftDate(date, 1))}>
                <ChevronRight />
              </IconButton>
              {!isToday && (
                <Button size="sm" onClick={() => setDate(today)}>
                  Back to today
                </Button>
              )}
            </div>
            {canWalkIn && <Button onClick={() => setWalkInOpen(true)}>Add to queue</Button>}
            {canBook && (
              <Button variant="primary" onClick={() => setBookOpen(true)}>
                Book appointment
              </Button>
            )}
          </>
        }
      />

      {day.isError ? (
        <ErrorState
          title="The schedule could not be loaded"
          message="Check your connection and try again."
          onRetry={() => void day.refetch()}
        />
      ) : loading ? (
        <div className="space-y-8">
          <Skeleton className="h-40" />
          <Skeleton className="h-56" />
        </div>
      ) : total === 0 ? (
        <EmptyState
          title={isToday ? 'Nothing is scheduled today' : 'Nothing is scheduled for this day'}
          description="Booked appointments and walk-ins appear here, grouped by where each patient is."
          action={
            canBook && (
              <Button variant="primary" onClick={() => setBookOpen(true)}>
                Book appointment
              </Button>
            )
          }
          className="rounded-lg border border-rule bg-surface"
        />
      ) : (
        <div className="space-y-10">
          {withClinician.length > 0 && (
            <Group
              title="With a clinician"
              rows={withClinician}
              columns={[patient, { ...clinician, showFrom: 'sm' }, reason]}
            />
          )}
          {(waiting.length > 0 || isToday) && (
            <Group
              title="Waiting"
              note="Urgent first, then by arrival"
              rows={waiting}
              columns={waitingColumns}
              empty="No one is waiting"
            />
          )}
          {expected.length > 0 && (
            <Group
              title="Expected"
              note="Booked, not yet arrived"
              rows={expected}
              columns={expectedColumns}
            />
          )}
          {finished.length > 0 && (
            <Group
              title="Finished"
              rows={finished}
              columns={[
                time('Time'),
                patient,
                clinician,
                {
                  id: 'outcome',
                  header: 'Outcome',
                  mobile: 'meta',
                  cell: (a) => <AppointmentStatusBadge status={a.status} />,
                },
              ]}
            />
          )}
          {day.data && day.data.total > DAY_SIZE && (
            <p className="text-sm text-ink-500">
              Showing the first {DAY_SIZE} of {day.data.total} appointments for this day.
            </p>
          )}
        </div>
      )}

      <BookAppointmentDialog open={bookOpen} onOpenChange={setBookOpen} />
      <WalkInDialog open={walkInOpen} onOpenChange={setWalkInOpen} />
    </Page>
  );
}
