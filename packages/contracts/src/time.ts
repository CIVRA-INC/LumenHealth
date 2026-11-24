/**
 * Time zone helpers. All instants are persisted in UTC; "today" is always
 * evaluated in the organisation's IANA time zone.
 */

function offsetMinutes(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return Math.round((asUtc - (at.getTime() - at.getMilliseconds())) / 60_000);
}

/** The local calendar date (YYYY-MM-DD) at `at` in `timeZone`. */
export function localDate(timeZone: string, at: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
  return parts;
}

/** UTC instant at which the given local calendar day starts in `timeZone`. */
export function startOfLocalDay(timeZone: string, date: string): Date {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const guess = Date.UTC(y, m - 1, d);
  let result = guess - offsetMinutes(timeZone, new Date(guess)) * 60_000;
  // Re-evaluate once so days containing a DST change resolve correctly.
  result = guess - offsetMinutes(timeZone, new Date(result)) * 60_000;
  return new Date(result);
}

/** [start, end) of a local calendar day, as UTC instants. */
export function localDayBounds(timeZone: string, date: string): { start: Date; end: Date } {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const next = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  return { start: startOfLocalDay(timeZone, date), end: startOfLocalDay(timeZone, next) };
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}
