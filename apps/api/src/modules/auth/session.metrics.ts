// Issue #414 – Identity and Sessions: diagnostics and operational metrics
// Emits structured, PHI-free logs and in-process counters for session events.

type SessionEvent = "login_success" | "login_failure" | "token_refresh" | "logout" | "token_expired";

interface SessionMetric {
  event: SessionEvent;
  clinicId: string;
  userId?: string;
  role?: string;
  ts: string;
  meta?: Record<string, unknown>;
}

const counters: Record<SessionEvent, number> = {
  login_success: 0,
  login_failure: 0,
  token_refresh: 0,
  logout: 0,
  token_expired: 0,
};

function emit(metric: SessionMetric): void {
  counters[metric.event]++;
  // Structured log – no secrets, no PHI
  console.log(JSON.stringify({ level: "info", source: "session.metrics", ...metric }));
}

export function recordLogin(clinicId: string, userId: string, role: string): void {
  emit({ event: "login_success", clinicId, userId, role, ts: new Date().toISOString() });
}

export function recordLoginFailure(clinicId: string, reason: string): void {
  emit({ event: "login_failure", clinicId, ts: new Date().toISOString(), meta: { reason } });
}

export function recordTokenRefresh(clinicId: string, userId: string): void {
  emit({ event: "token_refresh", clinicId, userId, ts: new Date().toISOString() });
}

export function recordLogout(clinicId: string, userId: string): void {
  emit({ event: "logout", clinicId, userId, ts: new Date().toISOString() });
}

export function recordTokenExpired(clinicId: string): void {
  emit({ event: "token_expired", clinicId, ts: new Date().toISOString() });
}

/** Returns a snapshot of all counters – safe to expose on an internal /healthz endpoint. */
export function getSessionCounters(): Readonly<typeof counters> {
  return { ...counters };
}
