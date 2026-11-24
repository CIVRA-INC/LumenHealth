import {
  localDate,
  type AppointmentView,
  type DashboardView,
  type EncounterView,
  type Page,
  type QueueView,
} from '@lumen/contracts';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { minutesSince } from '../../lib/format';
import { useCan, useRequiredSession } from '../../lib/session';

export const LATE_AFTER_MINUTES = 15;
export const LONG_WAIT_MINUTES = 30;

export interface AttentionItem {
  id: string;
  kind: 'urgent' | 'long-wait' | 'late' | 'open-encounter';
  appointment?: AppointmentView;
  encounter?: EncounterView;
  /** One plain sentence saying what needs attention. */
  text: string;
}

/**
 * Everything the Today page shows, from the real API: summary counts, the live queue, today's whole
 * schedule (for the day ruler and the expected list) and in-progress encounters for those who may see them.
 */
export function useToday() {
  const session = useRequiredSession();
  const canReadEncounters = useCan('encounters.read');
  const today = localDate(session.organization.timezone);

  const summary = useQuery({
    queryKey: ['dashboard', session.branch.id],
    queryFn: () => api.get<DashboardView>('/dashboard'),
    refetchInterval: 30_000,
  });
  const queue = useQuery({
    queryKey: ['queue', session.branch.id],
    queryFn: () => api.get<QueueView>('/queue'),
    refetchInterval: 20_000,
  });
  const day = useQuery({
    queryKey: ['appointments', session.branch.id, { date: today, page: 1, size: 100 }],
    queryFn: () => api.get<Page<AppointmentView>>('/appointments', { date: today, pageSize: 100 }),
    refetchInterval: 30_000,
  });
  const encounters = useQuery({
    queryKey: ['encounters', session.branch.id, { status: 'IN_PROGRESS', page: 1, size: 20 }],
    queryFn: () =>
      api.get<Page<EncounterView>>('/encounters', { status: 'IN_PROGRESS', pageSize: 20 }),
    enabled: canReadEncounters,
    refetchInterval: 20_000,
  });

  const waiting = queue.data?.waiting ?? [];
  const appointments = day.data?.items ?? [];
  const expected = appointments.filter((a) => a.status === 'SCHEDULED');
  const seen = appointments.filter((a) => a.status === 'COMPLETED');
  const inProgress = encounters.data?.items ?? [];
  const mine = inProgress.filter((e) => e.attending.userId === session.user.id);

  const attention: AttentionItem[] = [
    ...waiting
      .filter((a) => a.priority === 'URGENT')
      .map((a): AttentionItem => ({
        id: `u-${a.id}`,
        kind: 'urgent',
        appointment: a,
        text: `Urgent, waiting ${a.checkedInAt ? minutesSince(a.checkedInAt) : 0} min`,
      })),
    ...waiting
      .filter(
        (a) =>
          a.priority !== 'URGENT' &&
          a.checkedInAt &&
          minutesSince(a.checkedInAt) >= LONG_WAIT_MINUTES,
      )
      .map((a): AttentionItem => ({
        id: `w-${a.id}`,
        kind: 'long-wait',
        appointment: a,
        text: `Waiting ${minutesSince(a.checkedInAt!)} min`,
      })),
    ...expected
      .filter(
        (a) =>
          new Date(a.scheduledStart) < new Date() &&
          minutesSince(a.scheduledStart) >= LATE_AFTER_MINUTES,
      )
      .map((a): AttentionItem => ({
        id: `l-${a.id}`,
        kind: 'late',
        appointment: a,
        text: `Expected ${minutesSince(a.scheduledStart)} min ago, not arrived`,
      })),
    ...mine
      .filter((e) => minutesSince(e.startedAt) >= 60)
      .map((e): AttentionItem => ({
        id: `o-${e.id}`,
        kind: 'open-encounter',
        encounter: e,
        text: `Your consultation has been open ${minutesSince(e.startedAt)} min and is not signed`,
      })),
  ];

  return {
    session,
    today,
    summary,
    queue,
    day,
    encounters,
    waiting,
    expected,
    seen,
    appointments,
    inProgress,
    mine,
    attention,
    canReadEncounters,
    loading: summary.isLoading || queue.isLoading || day.isLoading,
    failed: summary.isError && queue.isError,
  };
}
