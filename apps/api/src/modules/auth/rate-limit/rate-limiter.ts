/**
 * In-memory fixed-window rate limiter for the auth endpoints.
 *
 * Recreated for #1301: the controller has always imported `limited` from
 * `utils/rate-limiter.js`, but those helpers were dropped during the Express →
 * NestJS cutover (#1264) and the module could not resolve its dependencies.
 *
 * Scope: single process, in-memory. That matches the rest of the module's
 * stores (`identityStore`, `sessionStore`) which are also process-local. A
 * multi-instance deployment needs a shared backend (e.g. Redis) — out of scope
 * here, and deliberately no worse than the behaviour the code expects.
 */

type Window = {
  count: number;
  /** Epoch ms at which the current window expires. */
  resetAt: number;
};

const windows = new Map<string, Window>();

/** Window length for every auth limit. */
export const RATE_LIMIT_WINDOW_MS = 60_000;

/**
 * Record a hit against `key` and report whether the caller is now over
 * `limit` within the current window.
 *
 * Returns `true` when the request should be rejected (429). A key on its first
 * hit of a window is never limited, so a `limit` of N allows N requests and
 * rejects the N+1th.
 */
export function limited(key: string, limit: number, now: number = Date.now()): boolean {
  const current = windows.get(key);

  if (!current || now >= current.resetAt) {
    windows.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  current.count += 1;
  return current.count > limit;
}

/** Drop all counters. Used between tests so they do not leak into each other. */
export function _resetRateLimiter(): void {
  windows.clear();
}
