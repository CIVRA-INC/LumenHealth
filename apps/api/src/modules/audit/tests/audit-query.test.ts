import { describe, expect, it } from "vitest";
import { InvalidAuditQueryError, parseAnchoredFilter, parseAuditRange } from "../services/audit-query.js";

describe("parseAuditRange", () => {
  it("treats a date-only `to` as the end of that UTC day", () => {
    expect(parseAuditRange(undefined, "2026-03-31")).toEqual({ to: "2026-03-31T23:59:59.999Z" });
    // An entry created at the last millisecond of the day is inside the range.
    expect("2026-03-31T23:59:59.999Z" <= parseAuditRange(undefined, "2026-03-31").to!).toBe(true);
  });

  it("treats a date-only `from` as the start of that UTC day", () => {
    expect(parseAuditRange("2026-03-01", undefined)).toEqual({ from: "2026-03-01T00:00:00.000Z" });
  });

  it("normalizes datetimes, including offsets, to UTC", () => {
    expect(parseAuditRange("2026-03-01T10:00:00Z", "2026-03-01T12:30:00.5Z")).toEqual({
      from: "2026-03-01T10:00:00.000Z",
      to: "2026-03-01T12:30:00.500Z",
    });
    expect(parseAuditRange("2026-03-01T10:00:00+02:00", undefined)).toEqual({ from: "2026-03-01T08:00:00.000Z" });
    expect(parseAuditRange(undefined, "2026-03-01T00:30:00-05:00")).toEqual({ to: "2026-03-01T05:30:00.000Z" });
  });

  it("returns an empty range when nothing is given", () => {
    expect(parseAuditRange(undefined, undefined)).toEqual({});
    expect(parseAuditRange("", "")).toEqual({});
  });

  it.each(["banana", "2026-13-01", "2026-02-31", "2026-03-01T10:00:00", "20260301", "2026-03-01 10:00:00Z"])(
    "rejects %s",
    (value) => {
      expect(() => parseAuditRange(value, undefined)).toThrow(InvalidAuditQueryError);
      expect(() => parseAuditRange(undefined, value)).toThrow(InvalidAuditQueryError);
    },
  );

  it("rejects non-string values", () => {
    expect(() => parseAuditRange(["2026-03-01"], undefined)).toThrow(InvalidAuditQueryError);
  });

  it("rejects inverted ranges but allows a single-day range", () => {
    expect(() => parseAuditRange("2026-04-01", "2026-03-31")).toThrow(InvalidAuditQueryError);
    expect(parseAuditRange("2026-03-31", "2026-03-31")).toEqual({
      from: "2026-03-31T00:00:00.000Z",
      to: "2026-03-31T23:59:59.999Z",
    });
  });
});

describe("parseAnchoredFilter", () => {
  it("parses true, false and omitted", () => {
    expect(parseAnchoredFilter("true")).toBe(true);
    expect(parseAnchoredFilter("false")).toBe(false);
    expect(parseAnchoredFilter(undefined)).toBeUndefined();
  });

  it.each(["maybe", "1", "TRUE", ["true"]])("rejects %s", (value) => {
    expect(() => parseAnchoredFilter(value)).toThrow(InvalidAuditQueryError);
  });
});
