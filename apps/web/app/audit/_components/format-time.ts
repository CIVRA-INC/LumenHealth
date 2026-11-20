/**
 * Relative-time and duration formatting for the anchoring health panel.
 *
 * The unit is chosen from the floored value, so 59.6s stays "59s ago" and 3570s is "59m ago"
 * instead of rounding up into "60m ago" / "1m ago" at the unit boundary. `now` is a parameter so
 * tests do not depend on the wall clock.
 */

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function formatSeconds(totalSeconds: number, suffix: string): string {
  if (totalSeconds < MINUTE) return `${totalSeconds}s${suffix}`;
  if (totalSeconds < HOUR) return `${Math.floor(totalSeconds / MINUTE)}m${suffix}`;
  if (totalSeconds < DAY) return `${Math.floor(totalSeconds / HOUR)}h${suffix}`;
  return `${Math.floor(totalSeconds / DAY)}d${suffix}`;
}

export function formatRelativeTime(iso: string | null, now: number = Date.now()): string {
  if (!iso) return "never";
  const ms = now - new Date(iso).getTime();
  if (ms < 0) return "just now";
  return formatSeconds(Math.floor(ms / 1000), " ago");
}

/** Durations top out at hours (no day unit), matching the panel's existing display. */
export function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  const seconds = Math.floor(ms / 1000);
  if (seconds < MINUTE) return `${seconds}s`;
  if (seconds < HOUR) return `${Math.floor(seconds / MINUTE)}m`;
  return `${Math.floor(seconds / HOUR)}h`;
}
