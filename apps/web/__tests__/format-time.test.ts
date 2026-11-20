import { afterEach, describe, expect, it, vi } from "vitest";
import { formatDuration, formatRelativeTime } from "../app/audit/_components/format-time";

const NOW = Date.parse("2026-03-31T12:00:00.000Z");
const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString();

afterEach(() => vi.useRealTimers());

describe("formatRelativeTime (#1506)", () => {
  it.each([
    [59, "59s ago"],
    [60, "1m ago"],
    [3599, "59m ago"],
    [3600, "1h ago"],
    [86399, "23h ago"],
    [86400, "1d ago"],
  ])("formats %is as %s", (seconds, expected) => {
    expect(formatRelativeTime(ago(seconds), NOW)).toBe(expected);
  });

  it("floors fractional boundary values instead of rounding up", () => {
    expect(formatRelativeTime(new Date(NOW - 59_600).toISOString(), NOW)).toBe("59s ago");
    expect(formatRelativeTime(new Date(NOW - 3_570_000).toISOString(), NOW)).toBe("59m ago");
    expect(formatRelativeTime(new Date(NOW - 23.5 * 3600_000).toISOString(), NOW)).toBe("23h ago");
  });

  it("handles null and future timestamps", () => {
    expect(formatRelativeTime(null, NOW)).toBe("never");
    expect(formatRelativeTime(new Date(NOW + 5000).toISOString(), NOW)).toBe("just now");
  });

  it("defaults `now` to the current (fake) clock", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(formatRelativeTime(ago(120))).toBe("2m ago");
  });
});

describe("formatDuration (#1506)", () => {
  it.each([
    [59_000, "59s"],
    [60_000, "1m"],
    [3_599_000, "59m"],
    [3_600_000, "1h"],
    [59_600, "59s"],
    [3_570_000, "59m"],
  ])("formats %ims as %s", (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });

  it("renders null as a dash", () => {
    expect(formatDuration(null)).toBe("—");
  });
});
