import { sessionStore } from "./session-store.js";

/**
 * Session cleanup boundary for scheduled expiration enforcement.
 * Integrators can call this from cron/worker contexts.
 */
export function runSessionCleanup(): { purged: true; ranAt: string } {
  sessionStore.purgeExpired();
  return { purged: true, ranAt: new Date().toISOString() };
}
