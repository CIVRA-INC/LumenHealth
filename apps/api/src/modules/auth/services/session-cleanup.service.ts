import { sessionStore } from "../repositories/session.repository.js";

export function runSessionCleanup(): { purged: true; ranAt: string } {
  sessionStore.purgeExpired();
  return { purged: true, ranAt: new Date().toISOString() };
}
