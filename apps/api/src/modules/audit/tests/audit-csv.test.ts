import { describe, expect, it } from "vitest";
import type { AuditEntry } from "@lumen/types";
import {
  AUDIT_CSV_COLUMNS,
  auditEntriesToCsv,
  csvCell,
  exportFilename,
  parseExportFormat,
  sanitizeFilenamePart,
} from "../services/audit-csv.js";

const entry = (overrides: Partial<AuditEntry> = {}): AuditEntry => ({
  auditId: "a-1",
  clinicId: "c-1",
  action: "staff.invited",
  actorId: "actor-1",
  actorRole: "owner",
  createdAt: "2026-03-31T10:00:00.000Z",
  sha256Hash: "h1",
  ...overrides,
});

describe("csvCell", () => {
  it("leaves plain values alone and renders empties as empty", () => {
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell(undefined)).toBe("");
    expect(csvCell(null)).toBe("");
  });

  it("quotes commas, quotes and newlines per RFC 4180", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
    expect(csvCell("a\r\nb")).toBe('"a\r\nb"');
  });

  it.each(["=SUM(A1)", "+1", "-1", "@cmd", "\tx", "\rx"])("prefixes formula-leading cell %j with a single quote", (cell) => {
    expect(csvCell(cell).replace(/^"/, "").startsWith("'")).toBe(true);
  });

  it("neutralizes a formula that also needs quoting", () => {
    expect(csvCell('=HYPERLINK("http://x","y")')).toBe('"\'=HYPERLINK(""http://x"",""y"")"');
  });

  it("serializes objects as JSON strings", () => {
    expect(csvCell({ name: "Ada, L." })).toBe('"{""name"":""Ada, L.""}"');
  });
});

describe("auditEntriesToCsv", () => {
  it("writes a fixed header row and one row per entry with CRLF endings", () => {
    const csv = auditEntriesToCsv([entry({ before: { email: "=evil@x.com" }, after: { role: "admin" } })]);
    const [header, row, trailing] = csv.split("\r\n");

    expect(header).toBe(AUDIT_CSV_COLUMNS.join(","));
    expect(row.startsWith("a-1,2026-03-31T10:00:00.000Z,staff.invited,actor-1,owner,,,h1,")).toBe(true);
    expect(row).toContain('"{""email"":""=evil@x.com""}"');
    expect(trailing).toBe("");
  });

  it("guards formula-leading free text inside a top-level cell", () => {
    const csv = auditEntriesToCsv([entry({ actorId: "=cmd|' /C calc'!A0" })]);
    expect(csv.split("\r\n")[1]).toContain(",'=cmd|' /C calc'!A0,");
  });

  it("emits only the header for no entries", () => {
    expect(auditEntriesToCsv([])).toBe(`${AUDIT_CSV_COLUMNS.join(",")}\r\n`);
  });
});

describe("export format and filename", () => {
  it("defaults to json and rejects anything but json or csv", () => {
    expect(parseExportFormat(undefined)).toBe("json");
    expect(parseExportFormat("csv")).toBe("csv");
    expect(parseExportFormat("xml")).toBeNull();
    expect(parseExportFormat(["csv"])).toBeNull();
  });

  it("only produces filenames made of [A-Za-z0-9._-]", () => {
    const name = exportFilename('../etc/"passwd"\r\n', { from: "2026-03-01T00:00:00Z", to: "x/y" }, "2026-03-31T10:00:00.000Z", "csv");
    expect(name).toMatch(/^[A-Za-z0-9._-]+$/);
    expect(name.startsWith("audit-export-")).toBe(true);
    expect(name.endsWith(".csv")).toBe(true);
    expect(sanitizeFilenamePart("..hidden")).not.toMatch(/^\./);
    expect(sanitizeFilenamePart("")).toBe("unknown");
  });

  it("uses the generated date and optional range", () => {
    expect(exportFilename("clinic-1", {}, "2026-03-31T10:00:00.000Z", "json")).toBe("audit-export-clinic-1-2026-03-31.json");
    expect(exportFilename("clinic-1", { from: "2026-03-01", to: "2026-03-31" }, "2026-04-01T00:00:00.000Z", "csv")).toBe(
      "audit-export-clinic-1-from-2026-03-01-to-2026-03-31-2026-04-01.csv",
    );
  });
});
