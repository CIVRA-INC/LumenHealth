import type { AppointmentView } from '@lumen/contracts';
import { useEffect, useState } from 'react';
import { localDayBounds } from '@lumen/contracts';

export const MARKER: Record<AppointmentView['status'], string> = {
  SCHEDULED: 'border border-ink-700 bg-surface',
  CHECKED_IN: 'bg-warning-600',
  IN_CONSULTATION: 'bg-green-600',
  COMPLETED: 'bg-ink-800',
  CANCELLED: 'hidden',
  NO_SHOW: 'border border-danger-600 bg-danger-50',
};

/** Local clock hour (0 to 24, fractional) of an instant in `timeZone`. */
function hourOf(iso: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(iso);
  return (
    Number(parts.find((p) => p.type === 'hour')?.value) +
    Number(parts.find((p) => p.type === 'minute')?.value) / 60
  );
}

const STATUS_WORD: Record<AppointmentView['status'], string> = {
  SCHEDULED: 'expected',
  CHECKED_IN: 'waiting',
  IN_CONSULTATION: 'with a clinician',
  COMPLETED: 'seen',
  CANCELLED: 'cancelled',
  NO_SHOW: 'did not attend',
};

const clock = (hour: number) =>
  `${String(Math.floor(hour)).padStart(2, '0')}:${String(Math.floor((hour % 1) * 60)).padStart(2, '0')}`;

/**
 * The day ruler: hourly ticks across the working day with a marker for every appointment (placed at
 * its scheduled time, walk-ins at their arrival) and a needle for "now". It shows at a glance how the
 * day is loaded and how far it has run. The part of the day already gone is drawn darker than what is
 * ahead, and the needle is labelled "Now". Its key is the day summary above it. All positions come
 * from real appointments; nothing is invented.
 */
export function DayRuler({
  appointments,
  timeZone,
  date,
}: {
  appointments: AppointmentView[];
  timeZone: string;
  date: string;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const visible = appointments.filter((a) => a.status !== 'CANCELLED');
  const times = visible.map((a) =>
    hourOf(
      new Date(a.type === 'WALK_IN' && a.checkedInAt ? a.checkedInAt : a.scheduledStart),
      timeZone,
    ),
  );
  const nowHour = hourOf(now, timeZone);
  const { start, end } = localDayBounds(timeZone, date);
  const isToday = now >= start && now < end;
  const startHour = Math.max(
    0,
    Math.min(8, Math.floor(Math.min(...times, isToday ? nowHour : 24)) - 1),
  );
  const endHour = Math.min(
    24,
    Math.max(17, Math.ceil(Math.max(...times, isToday ? nowHour : 0)) + 1),
  );
  const span = endHour - startHour;
  const left = (h: number) => `${((h - startHour) / span) * 100}%`;
  const hours = Array.from({ length: span + 1 }, (_, i) => startHour + i);

  const counts = {
    expected: visible.filter((a) => a.status === 'SCHEDULED').length,
    waiting: visible.filter((a) => a.status === 'CHECKED_IN').length,
    withClinician: visible.filter((a) => a.status === 'IN_CONSULTATION').length,
    seen: visible.filter((a) => a.status === 'COMPLETED').length,
  };
  const label = `Day timeline from ${String(startHour).padStart(2, '0')}:00 to ${String(endHour).padStart(2, '0')}:00. ${visible.length} appointments: ${counts.expected} expected, ${counts.waiting} waiting, ${counts.withClinician} with a clinician, ${counts.seen} seen.`;

  return (
    <figure className="select-none">
      <div role="img" aria-label={label} className="relative h-[76px] overflow-hidden px-1">
        {/* Baseline: solid for the part of the day already gone, light for what is ahead. */}
        <div className="absolute inset-x-1 top-[38px] h-px bg-ink-300" />
        {isToday && nowHour > startHour && (
          <div
            className="absolute top-[37px] left-1 h-0.5 bg-ink-800"
            style={{
              width: `calc(${(Math.min(nowHour, endHour) - startHour) / span} * (100% - 0.5rem))`,
            }}
          />
        )}
        {hours.map((h) => (
          <div key={h} className="absolute top-[34px]" style={{ left: left(h) }}>
            <div className="h-[9px] w-px bg-ink-400" />
            {h < endHour && (
              <span
                className={`data absolute top-[14px] text-2xs ${h === startHour ? '-left-px' : '-translate-x-1/2'} ${isToday && h + 1 <= nowHour ? 'text-ink-700' : 'text-ink-500'}`}
              >
                {String(h).padStart(2, '0')}
              </span>
            )}
          </div>
        ))}
        {/* Half-hour ticks. */}
        {hours.slice(0, -1).map((h) => (
          <div
            key={`h${h}`}
            className="absolute top-[36px] h-[5px] w-px bg-ink-300"
            style={{ left: left(h + 0.5) }}
          />
        ))}
        {/* Appointments. Markers that share a minute stack upward so none hides another. */}
        {visible.map((a, i) => {
          const t = times[i]!;
          const stack = times.slice(0, i).filter((o) => Math.abs(o - t) < 0.17).length;
          return (
            <span
              key={a.id}
              title={`${clock(t)}  ${a.patient.displayName}, ${STATUS_WORD[a.status]}`}
              className={`absolute size-[11px] -translate-x-1/2 rounded-full ${MARKER[a.status]}`}
              style={{ left: left(t), top: 21 - stack * 13 }}
            />
          );
        })}
        {/* Now. */}
        {isToday && nowHour >= startHour && nowHour <= endHour && (
          <div className="absolute top-0 bottom-0 w-px bg-ink-950" style={{ left: left(nowHour) }}>
            <span className="data absolute top-0 left-1 rounded-xs bg-ink-950 px-1.5 py-px text-2xs whitespace-nowrap text-white">
              Now {clock(nowHour)}
            </span>
          </div>
        )}
      </div>
    </figure>
  );
}
