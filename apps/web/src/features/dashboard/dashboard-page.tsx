import { Button, ErrorState, Skeleton, buttonVariants } from '@lumen/ui';
import { useState } from 'react';
import { Link } from 'react-router';
import { Page, PageHeader } from '../../components/page';
import { useCan } from '../../lib/session';
import { BookAppointmentDialog, WalkInDialog } from '../scheduling/booking-dialogs';
import { DayRuler } from './day-ruler';
import {
  AttentionList,
  DaySummary,
  ExpectedList,
  InConsultationList,
  NextAction,
  WaitingList,
} from './today-parts';
import { useToday } from './use-today';

function formatEyebrow(timezone: string) {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: timezone,
  }).format(new Date());
}

/**
 * Today: a working view of the day. The next action for this person sits on top, the day ruler shows how
 * the day is loaded, the worklists carry the work, and a short list names what is overdue.
 */
export function DashboardPage() {
  const t = useToday();
  const tz = t.session.organization.timezone;
  const canWalkIn = useCan('queue.manage');
  const canBook = useCan('appointments.write');
  const canRegister = useCan('patients.write');
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);

  if (t.failed) {
    return (
      <Page>
        <PageHeader eyebrow={formatEyebrow(tz)} title="Today" />
        <ErrorState
          title="Today’s activity could not be loaded"
          message="Check your connection and try again."
          onRetry={() => void t.summary.refetch()}
        />
      </Page>
    );
  }

  const counts = t.summary.data?.counts;
  return (
    <Page>
      <PageHeader
        eyebrow={formatEyebrow(tz)}
        title="Today"
        actions={
          <>
            {canRegister && (
              <Link to="/patients/new" className={buttonVariants()}>
                Register patient
              </Link>
            )}
            {canBook && <Button onClick={() => setBookOpen(true)}>Book appointment</Button>}
            {canWalkIn && (
              <Button
                variant={canRegister ? 'secondary' : 'primary'}
                onClick={() => setWalkInOpen(true)}
              >
                Add walk-in
              </Button>
            )}
          </>
        }
      />

      {!t.loading && (
        <NextAction waiting={t.waiting} expected={t.expected} mine={t.mine} timezone={tz} />
      )}

      <div className="mb-8">
        {t.loading || !counts ? (
          <Skeleton className="h-24" />
        ) : (
          <>
            <DaySummary
              expected={t.expected.length}
              waiting={counts.waiting}
              withClinician={counts.inConsultation}
              seen={counts.completedToday}
              median={t.summary.data?.medianWaitMinutes}
            />
            <div className="mt-3">
              <DayRuler appointments={t.appointments} timeZone={tz} date={t.today} />
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 items-start gap-x-12 gap-y-10 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-10">
          <WaitingList waiting={t.waiting} loading={t.queue.isLoading} timezone={tz} />
          <InConsultationList
            encounters={t.canReadEncounters ? t.inProgress : undefined}
            fallback={t.queue.data?.inConsultation ?? []}
            loading={t.canReadEncounters ? t.encounters.isLoading : t.queue.isLoading}
            timezone={tz}
            me={t.session.user.id}
          />
        </div>
        <div className="space-y-10">
          <AttentionList items={t.attention} />
          <ExpectedList expected={t.expected} loading={t.day.isLoading} timezone={tz} />
        </div>
      </div>

      <WalkInDialog open={walkInOpen} onOpenChange={setWalkInOpen} />
      <BookAppointmentDialog open={bookOpen} onOpenChange={setBookOpen} />
    </Page>
  );
}
