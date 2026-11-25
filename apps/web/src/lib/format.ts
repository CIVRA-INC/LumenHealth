import { ageInYears } from '@lumen/contracts';

const cache = new Map<string, Intl.DateTimeFormat>();
function formatter(timeZone: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${timeZone}|${JSON.stringify(options)}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', { timeZone, ...options });
    cache.set(key, f);
  }
  return f;
}

export const formatTime = (iso: string, timeZone: string) =>
  formatter(timeZone, { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function zonedParts(iso: string, timeZone: string) {
  const parts = formatter(timeZone, {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return {
    day: get('day'),
    month: MONTHS[Number(get('month')) - 1] ?? '',
    year: get('year'),
    hour: get('hour'),
    minute: get('minute'),
  };
}

/** "23 Oct 2026": the same three-letter month everywhere. */
export const formatDate = (iso: string, timeZone: string) => {
  const p = zonedParts(iso, timeZone);
  return `${p.day} ${p.month} ${p.year}`;
};

/** "23 Oct, 11:02" */
export const formatDateTime = (iso: string, timeZone: string) => {
  const p = zonedParts(iso, timeZone);
  return `${p.day} ${p.month}, ${p.hour}:${p.minute}`;
};

/** A calendar date with no time zone (e.g. date of birth), shown as written. */
export function formatDateOnly(date: string): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function ageLabel(dateOfBirth: string): string {
  const years = ageInYears(dateOfBirth);
  if (years >= 2) return `${years} yrs`;
  const [y, m, d] = dateOfBirth.split('-').map(Number) as [number, number, number];
  const now = new Date();
  const months =
    (now.getUTCFullYear() - y) * 12 + (now.getUTCMonth() + 1 - m) - (now.getUTCDate() < d ? 1 : 0);
  return `${Math.max(0, months)} mo`;
}

/** "12 min", "1 h 05 min": time elapsed since an instant. */
export function elapsedLabel(iso: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`;
}

export function minutesSince(iso: string, now = Date.now()): number {
  return Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
}

/** Converts a datetime-local input value (wall-clock in `timeZone`) to a UTC ISO instant. */
export function zonedInputToIso(value: string, timeZone: string): string {
  const [datePart, timePart] = value.split('T') as [string, string];
  const [y, mo, d] = datePart.split('-').map(Number) as [number, number, number];
  const [h, mi] = timePart.split(':').map(Number) as [number, number];
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const offset = (instant: number) => {
    const parts = formatter(timeZone, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(instant));
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    return (
      Date.UTC(
        get('year'),
        get('month') - 1,
        get('day'),
        get('hour'),
        get('minute'),
        get('second'),
      ) - instant
    );
  };
  const first = guess - offset(guess);
  return new Date(guess - offset(first)).toISOString();
}

/** Current wall-clock time in `timeZone` plus `addMinutes`, formatted for a datetime-local input. */
export function nowInZoneForInput(timeZone: string, addMinutes = 0): string {
  const parts = formatter(timeZone, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(Date.now() + addMinutes * 60_000));
  const get = (t: string) => parts.find((p) => p.type === t)?.value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}
