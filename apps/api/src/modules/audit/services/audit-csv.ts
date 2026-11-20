import type { AuditEntry } from "@lumen/types";

export const AUDIT_CSV_COLUMNS = [
  "auditId",
  "createdAt",
  "action",
  "actorId",
  "actorRole",
  "targetType",
  "targetId",
  "sha256Hash",
  "stellarTxHash",
  "anchoredAt",
  "anchorMode",
  "before",
  "after",
] as const;

/** Characters that make a spreadsheet treat a cell as a formula (CSV injection). */
const FORMULA_LEADERS = /^[=+\-@\t\r]/;

/**
 * Escapes one CSV cell per RFC 4180 and neutralizes spreadsheet formulas: a cell starting with
 * `=`, `+`, `-`, `@`, tab or CR gets a leading single quote. Objects are serialized as JSON.
 */
export function csvCell(value: unknown): string {
  let text =
    value === undefined || value === null
      ? ""
      : typeof value === "string"
        ? value
        : typeof value === "object"
          ? JSON.stringify(value)
          : String(value);

  if (FORMULA_LEADERS.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Builds the CSV body (header row plus one row per entry, CRLF line endings). */
export function auditEntriesToCsv(entries: readonly AuditEntry[]): string {
  const rows = entries.map((entry) =>
    AUDIT_CSV_COLUMNS.map((column) => csvCell((entry as Record<string, unknown>)[column])).join(","),
  );
  return [AUDIT_CSV_COLUMNS.join(","), ...rows].join("\r\n") + "\r\n";
}

export type ExportFormat = "json" | "csv";

/** Returns the requested export format, or `null` when it is not `json` or `csv`. Absent means `json`. */
export function parseExportFormat(value: unknown): ExportFormat | null {
  if (value === undefined || value === "") return "json";
  return value === "json" || value === "csv" ? value : null;
}

/** Keeps only `[A-Za-z0-9._-]`, never leads with a dot, and bounds the length. */
export function sanitizeFilenamePart(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9._-]/g, "_").replace(/^\.+/, "_").slice(0, 64);
  return cleaned || "unknown";
}

/** `audit-export-<clinic>[-from-<x>][-to-<y>]-<generated date>.<ext>` using only safe characters. */
export function exportFilename(
  clinicId: string,
  range: { from?: string; to?: string },
  generatedAt: string,
  extension: ExportFormat,
): string {
  const parts = ["audit-export", sanitizeFilenamePart(clinicId)];
  if (range.from) parts.push("from", sanitizeFilenamePart(range.from.slice(0, 10)));
  if (range.to) parts.push("to", sanitizeFilenamePart(range.to.slice(0, 10)));
  parts.push(sanitizeFilenamePart(generatedAt.slice(0, 10)));
  return `${parts.join("-")}.${extension}`;
}
