import type { AuthEventType } from "@lumen/types";

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

interface AuthLogEntry {
  event: AuthEventType;
  userId?: string;
  clinicId?: string;
  durationMs?: number;
  requestId?: string;
  meta?: Record<string, unknown>;
}

/**
 * Minimum level to emit; anything below is dropped. Configurable via LOG_LEVEL
 * so production can suppress debug/info noise (see issue #1018). Read lazily on
 * each call so tests / runtime can flip it without re-importing.
 */
function minLevel(): LogLevel {
  const raw = process.env.LOG_LEVEL?.toLowerCase();
  return raw === "debug" || raw === "info" || raw === "warn" || raw === "error" ? raw : "info";
}

/**
 * `meta` keys whose values are replaced with "[REDACTED]" before a line is
 * emitted — audit/compliance logging for a health app must not leak PII or
 * secrets into log pipelines (see issue #1018). Compared case-insensitively.
 */
const SENSITIVE_META_KEYS = new Set([
  "password",
  "token",
  "accesstoken",
  "refreshtoken",
  "authorization",
  "ipaddress",
  "ip",
  "secret",
  "ssn",
]);

function redactMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    out[key] = SENSITIVE_META_KEYS.has(key.toLowerCase()) ? "[REDACTED]" : value;
  }
  return out;
}

/**
 * Pluggable transport: receives the log level and the already-serialized line.
 * The default routes by level to the matching console stream so error/warn
 * reach stderr (see issue #1017); swap it out (e.g. for a structured shipper)
 * via {@link setLogTransport}.
 */
export type LogTransport = (level: LogLevel, line: string) => void;

const consoleTransport: LogTransport = (level, line) => {
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
};

let transport: LogTransport = consoleTransport;

/** Replace the log transport (e.g. to ship structured logs elsewhere). */
export function setLogTransport(next: LogTransport): void {
  transport = next;
}

/** Restore the default level-routed console transport. */
export function resetLogTransport(): void {
  transport = consoleTransport;
}

function write(level: LogLevel, entry: AuthLogEntry): void {
  if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[minLevel()]) {
    return;
  }
  const line = JSON.stringify({
    level,
    event: entry.event,
    ...(entry.userId !== undefined && { userId: entry.userId }),
    ...(entry.clinicId !== undefined && { clinicId: entry.clinicId }),
    timestamp: new Date().toISOString(),
    ...(entry.durationMs !== undefined && { durationMs: entry.durationMs }),
    ...(entry.requestId !== undefined && { requestId: entry.requestId }),
    meta: redactMeta(entry.meta ?? {}),
  });
  transport(level, line);
}

export const authLogger = {
  debug: (event: AuthEventType, fields?: Omit<AuthLogEntry, "event">) =>
    write("debug", { event, ...fields }),
  info: (event: AuthEventType, fields?: Omit<AuthLogEntry, "event">) =>
    write("info", { event, ...fields }),
  warn: (event: AuthEventType, fields?: Omit<AuthLogEntry, "event">) =>
    write("warn", { event, ...fields }),
  error: (event: AuthEventType, fields?: Omit<AuthLogEntry, "event">) =>
    write("error", { event, ...fields }),
};
