export interface DanielshipsLockoutState {
  lockedUntilMs: number | null;
  message?: string;
}

export function parseRetryAfterMs(headers: Record<string, string | undefined>, nowMs = Date.now()): number | null {
  const ra = headers["retry-after"] ?? headers["Retry-After"];
  if (!ra) return null;
  const secs = Number(ra);
  if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
  const date = Date.parse(ra);
  if (!Number.isNaN(date)) return Math.max(0, date - nowMs);
  return null;
}

export function lockoutFrom429(headers: Record<string, string | undefined>, body?: { message?: string }, nowMs = Date.now()): DanielshipsLockoutState {
  const retryMs = parseRetryAfterMs(headers, nowMs);
  return { lockedUntilMs: retryMs != null ? nowMs + retryMs : nowMs + 60000, message: body?.message || "Too many attempts. Please wait before trying again." };
}

export function remainingLockoutSeconds(state: DanielshipsLockoutState, nowMs = Date.now()): number {
  if (!state.lockedUntilMs) return 0;
  return Math.max(0, Math.ceil((state.lockedUntilMs - nowMs) / 1000));
}

export function isLoginLocked(state: DanielshipsLockoutState, nowMs = Date.now()): boolean {
  return remainingLockoutSeconds(state, nowMs) > 0;
}
