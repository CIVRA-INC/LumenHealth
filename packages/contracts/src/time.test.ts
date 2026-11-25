import { describe, expect, it } from 'vitest';
import { localDate, localDayBounds } from './time';

describe('time zone helpers', () => {
  it('computes the local day for Africa/Lagos (UTC+1, no DST)', () => {
    const { start, end } = localDayBounds('Africa/Lagos', '2026-03-10');
    expect(start.toISOString()).toBe('2026-03-09T23:00:00.000Z');
    expect(end.toISOString()).toBe('2026-03-10T23:00:00.000Z');
  });

  it('handles a spring-forward day (23 hours) in America/New_York', () => {
    const { start, end } = localDayBounds('America/New_York', '2026-03-08');
    expect(start.toISOString()).toBe('2026-03-08T05:00:00.000Z');
    expect(end.toISOString()).toBe('2026-03-09T04:00:00.000Z');
    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(23);
  });

  it('determines the local date near midnight UTC', () => {
    expect(localDate('Africa/Lagos', new Date('2026-03-09T23:30:00Z'))).toBe('2026-03-10');
    expect(localDate('UTC', new Date('2026-03-09T23:30:00Z'))).toBe('2026-03-09');
  });
});
