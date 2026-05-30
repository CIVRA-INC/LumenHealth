// Auth 027 — Session persistence model and expiration policy
// Closes #462
//
// In-memory session store for the MVP. Replace with Redis or DB in a later milestone.

export type SessionRecord = {
  sessionId: string;
  userId: string;
  clinicId: string;
  accessToken: string;
  refreshToken: string;
  /** Unix epoch seconds */
  expiresAt: number;
  createdAt: string; // ISO-8601
};

const store = new Map<string, SessionRecord>();

export const sessionStore = {
  save(session: SessionRecord): void {
    store.set(session.sessionId, session);
  },

  findBySessionId(sessionId: string): SessionRecord | undefined {
    return store.get(sessionId);
  },

  findByAccessToken(accessToken: string): SessionRecord | undefined {
    return [...store.values()].find((s) => s.accessToken === accessToken);
  },

  delete(sessionId: string): void {
    store.delete(sessionId);
  },

  /** Returns true if the session exists and has not expired. */
  isValid(sessionId: string): boolean {
    const session = store.get(sessionId);
    if (!session) return false;
    return Math.floor(Date.now() / 1000) < session.expiresAt;
  },

  /** Removes all expired sessions. Call periodically or on demand. */
  purgeExpired(): void {
    const now = Math.floor(Date.now() / 1000);
    for (const [id, session] of store) {
      if (session.expiresAt <= now) store.delete(id);
    }
  },

  /** Exposed for tests only. */
  _reset(): void {
    store.clear();
  },
};

/**
 * Builds a new SessionRecord with expiry derived from the configured TTL.
 * @param ttlSeconds  Access token TTL in seconds (default: 900 / 15 min).
 */
export function makeSession(
  fields: Omit<SessionRecord, "expiresAt" | "createdAt">,
  ttlSeconds = 900
): SessionRecord {
  return {
    ...fields,
    expiresAt: Math.floor(Date.now() / 1000) + ttlSeconds,
    createdAt: new Date().toISOString(),
  };
}
