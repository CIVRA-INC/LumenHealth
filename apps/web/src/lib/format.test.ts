import { describe, expect, it } from 'vitest';
import {
  ageLabel,
  elapsedLabel,
  formatDateOnly,
  formatTime,
  nowInZoneForInput,
  zonedInputToIso,
} from './format';

describe('time zone conversion', () => {
  it('converts a Lagos wall-clock time to UTC (UTC+1, no DST)', () => {
    expect(zonedInputToIso('2026-03-10T09:30', 'Africa/Lagos')).toBe('2026-03-10T08:30:00.000Z');
  });

  it('respects daylight saving time', () => {
    // New York is UTC-5 in winter and UTC-4 after the March change.
    expect(zonedInputToIso('2026-03-01T09:00', 'America/New_York')).toBe(
      '2026-03-01T14:00:00.000Z',
    );
    expect(zonedInputToIso('2026-03-15T09:00', 'America/New_York')).toBe(
      '2026-03-15T13:00:00.000Z',
    );
  });

  it('formats instants in the organisation time zone, not the browser’s', () => {
    expect(formatTime('2026-03-10T23:30:00Z', 'Africa/Lagos')).toBe('00:30');
    expect(formatTime('2026-03-10T23:30:00Z', 'UTC')).toBe('23:30');
  });

  it('round-trips the current wall-clock time', () => {
    const local = nowInZoneForInput('Africa/Lagos');
    const iso = zonedInputToIso(local, 'Africa/Lagos');
    expect(Math.abs(new Date(iso).getTime() - Date.now())).toBeLessThan(120_000);
  });
});

describe('display helpers', () => {
  it('shows a date of birth exactly as recorded, regardless of zone', () => {
    expect(formatDateOnly('1990-01-01')).toBe('1 Jan 1990');
  });

  it('labels elapsed time', () => {
    const now = Date.parse('2026-03-10T12:00:00Z');
    expect(elapsedLabel('2026-03-10T11:48:00Z', now)).toBe('12 min');
    expect(elapsedLabel('2026-03-10T10:55:00Z', now)).toBe('1 h 05 min');
  });

  it('uses months for infants', () => {
    const dob = new Date(Date.now() - 100 * 86_400_000).toISOString().slice(0, 10);
    expect(ageLabel(dob)).toMatch(/^\d mo$/);
  });
});
