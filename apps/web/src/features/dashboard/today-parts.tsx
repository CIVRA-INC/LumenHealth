import type { AppointmentView, EncounterView } from '@lumen/contracts';
import {
  Button,
  DataTable,
  EmptyState,
  SectionHeader,
  StatusIndicator,
  Tag,
  type Column,
} from '@lumen/ui';
import { Link } from 'react-router';
import { PatientCell } from '../../components/patient-banner';
import { PriorityBadge } from '../../components/status';
import { elapsedLabel, formatTime, minutesSince } from '../../lib/format';
import { useCan } from '../../lib/session';
import { useCheckIn, useStartEncounter } from '../scheduling/hooks';
import { MARKER } from './day-ruler';
import { LATE_AFTER_MINUTES, LONG_WAIT_MINUTES, type AttentionItem } from './use-today';

/** The single most useful next step for the signed-in person, stated plainly with its action. */
export function NextAction({
  waiting,
  expected,
  mine,
  timezone,
}: {
  waiting: AppointmentView[];
  expected: AppointmentView[];
  mine: EncounterView[];
  timezone: string;
}) {
  const canStart = useCan('encounters.start');
  const canCheckIn = useCan('queue.manage');
  const start = useStartEncounter();
  const checkIn = useCheckIn();

  let content: { label: string; title: string; detail: string; action: React.ReactNode } | null =
    null;
  if (canStart && mine[0]) {
    const e = mine[0];
    content = {
      label: 'Continue',
      title: e.patient.displayName,
      detail: `Consultation open since ${formatTime(e.startedAt, timezone)}${mine.length > 1 ? `, and ${mine.length - 1} more of yours` : ''}`,
      action: (
        <Link
          to={`/encounters/${e.id}`}
          className="inline-flex h-8 items-center rounded-md bg-lime-400 px-3 text-base font-medium text-ink-950 hover:bg-lime-500"
        >
          Open consultation
        </Link>
      ),
    };
  } else if (canStart && waiting[0]) {
    const a = waiting[0];
    content = {
      label: 'Next patient',
      title: a.patient.displayName,
      detail: `${a.priority === 'URGENT' ? 'Urgent. ' : ''}${a.reason ?? 'No reason given'}. Waiting ${a.checkedInAt ? elapsedLabel(a.checkedInAt) : ''}`,
      action: (
        <Button variant="primary" loading={start.isPending} onClick={() => start.mutate(a)}>
          Start consultation
        </Button>
      ),
    };
  } else if (canCheckIn && expected[0]) {
    const a = expected[0];
    const late =
      new Date(a.scheduledStart) < new Date() &&
      minutesSince(a.scheduledStart) >= LATE_AFTER_MINUTES;
    content = {
      label: late ? 'Overdue arrival' : 'Next arrival',
      title: a.patient.displayName,
      detail: `Booked for ${formatTime(a.scheduledStart, timezone)}${a.clinician ? ` with ${a.clinician.fullName}` : ''}`,
      action: (
        <Button variant="primary" loading={checkIn.isPending} onClick={() => checkIn.mutate(a.id)}>
          Check in
        </Button>
      ),
    };
  }
  if (!content) return null;
  return (
    <section
      aria-label={content.label}
      className="mb-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-lg border border-l-[3px] border-rule border-l-green-800 bg-surface py-3 pr-3 pl-4"
    >
      <div className="min-w-0">
        <p className="text-xs text-ink-500">{content.label}</p>
        <p className="display line-clamp-2 text-xl text-ink-950" title={content.title}>
          {content.title}
        </p>
        <p className="text-sm text-ink-600">{content.detail}</p>
      </div>
      {content.action}
    </section>
  );
}

/**
 * The state of the day in one line. Each count carries the same marker as the day ruler beneath it, so
 * this line is also the ruler's key: no separate legend to cross-reference.
 */
export function DaySummary({
  expected,
  waiting,
  withClinician,
  seen,
  median,
}: {
  expected: number;
  waiting: number;
  withClinician: number;
  seen: number;
  median: number | null | undefined;
}) {
  const part = (n: number, label: string, status: AppointmentView['status'], tone?: string) => (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
      <span
        aria-hidden
        className={`size-2.5 translate-y-px self-center rounded-full ${MARKER[status]}`}
      />
      <span className={`data text-md font-medium ${tone ?? 'text-ink-950'}`}>{n}</span> {label}
    </span>
  );
  return (
    <p className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-base text-ink-700">
      {part(waiting, 'waiting', 'CHECKED_IN', waiting > 0 ? 'text-warning-700' : undefined)}
      {part(withClinician, 'with a clinician', 'IN_CONSULTATION')}
      {part(expected, 'still expected', 'SCHEDULED')}
      {part(seen, 'seen', 'COMPLETED')}
      {median != null && (
        <span className="text-ink-500">
          Median wait today <span className="data">{median}</span> min
        </span>
      )}
    </p>
  );
}

export function WaitingList({
  waiting,
  loading,
  timezone,
}: {
  waiting: AppointmentView[];
  loading: boolean;
  timezone: string;
}) {
  const canStart = useCan('encounters.start');
  const start = useStartEncounter();
  const columns: Column<AppointmentView>[] = [
    {
      id: 'no',
      header: 'Ticket',
      cell: (a) => <span className="data text-ink-600">{a.ticketNumber}</span>,
      width: 'w-16',
      mobile: 'hidden',
    },
    {
      id: 'patient',
      header: 'Patient',
      mobile: 'title',
      cell: (a) => (
        <div className="flex flex-wrap items-center gap-x-2">
          <PatientCell patient={a.patient} />
          <PriorityBadge priority={a.priority} />
          {canStart && a.id === waiting[0]?.id && <Tag tone="info">Next</Tag>}
        </div>
      ),
    },
    {
      id: 'reason',
      header: 'Reason',
      showFrom: 'lg',
      mobile: 'meta',
      cell: (a) => <span className="line-clamp-1 text-ink-700">{a.reason ?? '—'}</span>,
    },
    {
      id: 'waiting',
      header: 'Waiting',
      align: 'right',
      mobile: 'meta',
      className: 'whitespace-nowrap',
      cell: (a) => {
        const m = a.checkedInAt ? minutesSince(a.checkedInAt) : 0;
        return (
          <span
            className={`data ${m >= LONG_WAIT_MINUTES ? 'font-medium text-warning-700' : 'text-ink-700'}`}
          >
            {m} min
            {a.checkedInAt && (
              <span className="ml-2 font-normal text-ink-500 md:ml-0 md:block md:text-xs">
                since {formatTime(a.checkedInAt, timezone)}
              </span>
            )}
          </span>
        );
      },
    },
  ];
  return (
    <section>
      <SectionHeader
        title="Waiting"
        meta={waiting.length}
        action={
          <Link to="/schedule" className="text-sm font-medium text-green-700 hover:underline">
            Open schedule
          </Link>
        }
      />
      <DataTable
        bordered={false}
        caption="Patients waiting"
        columns={columns}
        rows={waiting}
        rowKey={(a) => a.id}
        loading={loading}
        skeletonRows={3}
        empty={
          <EmptyState
            title="No one is waiting"
            description="Patients appear here as soon as they are checked in."
            className="py-8"
          />
        }
        rowActions={
          canStart
            ? (a) => (
                <Button
                  size="sm"
                  loading={start.isPending && start.variables?.id === a.id}
                  onClick={() => start.mutate(a)}
                >
                  Start
                </Button>
              )
            : undefined
        }
      />
    </section>
  );
}

export function InConsultationList({
  encounters,
  fallback,
  loading,
  timezone,
  me,
}: {
  encounters: EncounterView[] | undefined;
  fallback: AppointmentView[];
  loading: boolean;
  timezone: string;
  me: string;
}) {
  const canOpen = useCan('encounters.read');
  const count = encounters ? encounters.length : fallback.length;
  type Row = {
    id: string;
    patient: AppointmentView['patient'];
    clinician: string;
    since?: string;
    to?: string;
  };
  const rows: Row[] = encounters
    ? encounters.map((e) => ({
        id: e.id,
        patient: e.patient,
        clinician: e.attending.userId === me ? 'You' : e.attending.fullName,
        since: e.startedAt,
        to: `/encounters/${e.id}`,
      }))
    : fallback.map((a) => ({
        id: a.id,
        patient: a.patient,
        clinician: a.clinician?.fullName ?? '—',
        to: a.encounterId && canOpen ? `/encounters/${a.encounterId}` : undefined,
      }));
  const columns: Column<Row>[] = [
    {
      id: 'patient',
      header: 'Patient',
      mobile: 'title',
      cell: (r) => <PatientCell patient={r.patient} />,
    },
    {
      id: 'clinician',
      header: 'Clinician',
      mobile: 'meta',
      className: 'whitespace-nowrap',
      cell: (r) => (
        <span className={r.clinician === 'You' ? 'font-medium text-ink-950' : 'text-ink-700'}>
          {r.clinician}
        </span>
      ),
    },
    {
      id: 'since',
      header: 'Since',
      align: 'right',
      mobile: 'meta',
      cell: (r) => (
        <span className="data text-ink-700">
          {r.since ? formatTime(r.since, timezone) : <span className="max-md:hidden">—</span>}
        </span>
      ),
    },
  ];
  return (
    <section>
      <SectionHeader title="With a clinician" meta={count} />
      <DataTable
        bordered={false}
        caption="Consultations in progress"
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        loading={loading}
        skeletonRows={2}
        empty={<EmptyState title="No consultations in progress" className="py-8" />}
        rowActions={(r) =>
          r.to ? (
            <Link to={r.to} className="text-sm font-medium text-green-700 hover:underline">
              Open
            </Link>
          ) : null
        }
      />
    </section>
  );
}

export function ExpectedList({
  expected,
  loading,
  timezone,
}: {
  expected: AppointmentView[];
  loading: boolean;
  timezone: string;
}) {
  const canCheckIn = useCan('queue.manage');
  const checkIn = useCheckIn();
  return (
    <section>
      <SectionHeader quiet title="Expected" meta={expected.length} />
      {loading ? (
        <p className="py-6 text-sm text-ink-500">Loading…</p>
      ) : expected.length === 0 ? (
        <p className="py-6 text-sm text-ink-500">No one else is expected today.</p>
      ) : (
        <ul className="divide-y divide-rule-soft">
          {expected.map((a) => {
            const late =
              new Date(a.scheduledStart) < new Date() &&
              minutesSince(a.scheduledStart) >= LATE_AFTER_MINUTES;
            return (
              <li key={a.id} className="flex items-center gap-3 py-2.5">
                <span
                  className={`data w-11 shrink-0 text-sm ${late ? 'font-medium text-warning-700' : 'text-ink-700'}`}
                >
                  {formatTime(a.scheduledStart, timezone)}
                </span>
                <div className="min-w-0 flex-1">
                  <PatientCell patient={a.patient} />
                  <p className="truncate text-xs text-ink-500">
                    {late && <span className="font-medium text-warning-700">Late · </span>}
                    {a.clinician?.fullName ?? 'Any clinician'}
                  </p>
                </div>
                {canCheckIn && (
                  <Button
                    size="sm"
                    loading={checkIn.isPending && checkIn.variables === a.id}
                    onClick={() => checkIn.mutate(a.id)}
                  >
                    Check in
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

const ATTENTION_TONE = {
  urgent: 'danger',
  'long-wait': 'warning',
  late: 'warning',
  'open-encounter': 'info',
} as const;
const ATTENTION_LABEL = {
  urgent: 'Urgent',
  'long-wait': 'Long wait',
  late: 'Late',
  'open-encounter': 'Unsigned',
} as const;

/** Things that need a person right now, derived from the live data. Empty means all is well. */
export function AttentionList({ items }: { items: AttentionItem[] }) {
  return (
    <section>
      <SectionHeader quiet title="Needs attention" meta={items.length || undefined} />
      {items.length === 0 ? (
        <p className="py-6 text-sm text-ink-500">
          Nothing is overdue. No urgent patients or long waits.
        </p>
      ) : (
        <ul className="divide-y divide-rule-soft">
          {items.map((item) => {
            const patient = item.appointment?.patient ?? item.encounter?.patient;
            return (
              <li key={item.id} className="py-2.5">
                <StatusIndicator tone={ATTENTION_TONE[item.kind]}>
                  {ATTENTION_LABEL[item.kind]}
                </StatusIndicator>
                <p className="mt-0.5 text-base">
                  {patient && (
                    <Link
                      to={
                        item.encounter
                          ? `/encounters/${item.encounter.id}`
                          : `/patients/${patient.id}`
                      }
                      className="font-medium text-ink-950 hover:underline"
                    >
                      {patient.displayName}
                    </Link>
                  )}
                  <span className="text-ink-700">. {item.text}.</span>
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
