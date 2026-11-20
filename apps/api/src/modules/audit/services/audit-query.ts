/** Raised for malformed audit query parameters; controllers map it to 400 `INVALID_QUERY`. */
export class InvalidAuditQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAuditQueryError";
  }
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
// ISO 8601 datetime with an explicit zone (`Z` or `+02:00`); a zone-less value would depend on the host.
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/;

function parseBound(name: "from" | "to", raw: string): string {
  const value = raw.trim();

  const dateOnly = DATE_ONLY.exec(value);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    const start = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    // Reject impossible dates such as 2026-02-31, which Date.UTC silently rolls over.
    if (start.getUTCFullYear() !== Number(y) || start.getUTCMonth() !== Number(m) - 1 || start.getUTCDate() !== Number(d)) {
      throw new InvalidAuditQueryError(`${name} is not a valid date`);
    }
    // A date-only upper bound means "through the end of that day".
    return name === "to" ? new Date(start.getTime() + 24 * 3600 * 1000 - 1).toISOString() : start.toISOString();
  }

  if (DATE_TIME.test(value)) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  throw new InvalidAuditQueryError(`${name} must be an ISO date (YYYY-MM-DD) or datetime with a timezone`);
}

/**
 * Normalizes the `from`/`to` query parameters into UTC ISO strings that compare correctly
 * against `AuditEntry.createdAt`. `from=2026-03-01` starts at 00:00:00.000Z and `to=2026-03-31`
 * ends at 23:59:59.999Z. Invalid values and `from > to` throw {@link InvalidAuditQueryError}.
 */
export function parseAuditRange(from: unknown, to: unknown): { from?: string; to?: string } {
  const range: { from?: string; to?: string } = {};
  if (from !== undefined && from !== "") {
    if (typeof from !== "string") throw new InvalidAuditQueryError("from must be a string");
    range.from = parseBound("from", from);
  }
  if (to !== undefined && to !== "") {
    if (typeof to !== "string") throw new InvalidAuditQueryError("to must be a string");
    range.to = parseBound("to", to);
  }
  if (range.from && range.to && range.from > range.to) {
    throw new InvalidAuditQueryError("from must not be after to");
  }
  return range;
}

/** Parses the `anchored` filter strictly: only `true` or `false`. Absent means no filter. */
export function parseAnchoredFilter(value: unknown): boolean | undefined {
  if (value === undefined || value === "") return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new InvalidAuditQueryError("anchored must be 'true' or 'false'");
}
