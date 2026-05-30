// Auth observability baseline — Closes #444
// Structured JSON logger for auth events. No external dependencies.

import type { AuthEventType } from "@lumen/types";

type LogLevel = "info" | "warn" | "error";

interface AuthLogEntry {
  event: AuthEventType;
  userId?: string;
  clinicId?: string;
  durationMs?: number;
  requestId?: string;
  meta?: Record<string, unknown>;
}

function write(level: LogLevel, entry: AuthLogEntry): void {
  const line = JSON.stringify({
    level,
    event: entry.event,
    ...(entry.userId !== undefined && { userId: entry.userId }),
    ...(entry.clinicId !== undefined && { clinicId: entry.clinicId }),
    timestamp: new Date().toISOString(),
    ...(entry.durationMs !== undefined && { durationMs: entry.durationMs }),
    ...(entry.requestId !== undefined && { requestId: entry.requestId }),
    meta: entry.meta ?? {},
  });
  console.log(line);
}

export const authLogger = {
  info: (event: AuthEventType, fields?: Omit<AuthLogEntry, "event">) =>
    write("info", { event, ...fields }),
  warn: (event: AuthEventType, fields?: Omit<AuthLogEntry, "event">) =>
    write("warn", { event, ...fields }),
  error: (event: AuthEventType, fields?: Omit<AuthLogEntry, "event">) =>
    write("error", { event, ...fields }),
};
