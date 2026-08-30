import { sessionStore } from "../repositories/session.repository.js";

export function runSessionCleanup(): { purged: true; ranAt: string } {
  sessionStore.purgeExpired();
  return { purged: true, ranAt: new Date().toISOString() };
}

// Schedule periodic sweeps so expired sessions never accumulate.
const cleanupTimer = setInterval(() => runSessionCleanup(), 60_000) as unknown as NodeJS.Timeout;
cleanupTimer.unref();
