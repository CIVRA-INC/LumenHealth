export type SessionRecord = {
  sessionId: string;
  userId: string;
  clinicId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  createdAt: string;
};

const store = new Map<string, SessionRecord>();
const refreshIndex = new Map<string, string>();

export const sessionStore = {
  save(session: SessionRecord): void {
    store.set(session.sessionId, session);
    refreshIndex.set(session.refreshToken, session.sessionId);
  },

  findBySessionId(sessionId: string): SessionRecord | undefined {
    return store.get(sessionId);
  },

  findByAccessToken(accessToken: string): SessionRecord | undefined {
    return [...store.values()].find((s) => s.accessToken === accessToken);
  },

  findByRefreshToken(refreshToken: string): SessionRecord | undefined {
    const sessionId = refreshIndex.get(refreshToken);
    return sessionId ? store.get(sessionId) : undefined;
  },

  delete(sessionId: string): void {
    const session = store.get(sessionId);
    if (session) refreshIndex.delete(session.refreshToken);
    store.delete(sessionId);
  },

  revokeByRefreshToken(refreshToken: string): void {
    const sessionId = refreshIndex.get(refreshToken);
    if (sessionId) this.delete(sessionId);
  },

  isValid(sessionId: string): boolean {
    const session = store.get(sessionId);
    if (!session) return false;
    return Math.floor(Date.now() / 1000) < session.expiresAt;
  },

  purgeExpired(): void {
    const now = Math.floor(Date.now() / 1000);
    for (const [id, session] of store) {
      if (session.expiresAt <= now) store.delete(id);
    }
  },

  _reset(): void {
    store.clear();
    refreshIndex.clear();
  },
};

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
