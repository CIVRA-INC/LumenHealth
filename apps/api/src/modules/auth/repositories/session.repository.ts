import { createHash, randomUUID } from "node:crypto";

export type SessionRecord = {
  sessionId: string;
  userId: string;
  clinicId: string;
  accessToken: string;
  /** SHA-256 of the refresh token once saved; callers pass the raw token to `save`. */
  refreshToken: string;
  /** One family per login; reuse of a rotated token revokes the whole family. */
  familyId?: string;
  expiresAt: number;
  createdAt: string;
};

export const hashRefreshToken = (token: string): string => createHash("sha256").update(token).digest("hex");

const store = new Map<string, SessionRecord>();
const refreshIndex = new Map<string, string>(); // refresh token hash -> sessionId
const accessIndex = new Map<string, string>(); // access token -> sessionId
const userIndex = new Map<string, Set<string>>(); // userId -> sessionIds
const familyIndex = new Map<string, Set<string>>(); // familyId -> sessionIds
const rotated = new Map<string, string>(); // rotated refresh token hash -> familyId

function addTo(index: Map<string, Set<string>>, key: string, sessionId: string) {
  const ids = index.get(key) ?? new Set<string>();
  ids.add(sessionId);
  index.set(key, ids);
}

function removeFrom(index: Map<string, Set<string>>, key: string, sessionId: string) {
  const ids = index.get(key);
  ids?.delete(sessionId);
  if (ids && ids.size === 0) index.delete(key);
}

export const sessionStore = {
  save(session: SessionRecord): void {
    this.delete(session.sessionId);
    const record: SessionRecord = {
      ...session,
      refreshToken: hashRefreshToken(session.refreshToken),
      familyId: session.familyId ?? randomUUID(),
    };
    store.set(record.sessionId, record);
    refreshIndex.set(record.refreshToken, record.sessionId);
    accessIndex.set(record.accessToken, record.sessionId);
    addTo(userIndex, record.userId, record.sessionId);
    addTo(familyIndex, record.familyId as string, record.sessionId);
  },

  findBySessionId(sessionId: string): SessionRecord | undefined {
    return store.get(sessionId);
  },

  findByAccessToken(accessToken: string): SessionRecord | undefined {
    const sessionId = accessIndex.get(accessToken);
    return sessionId ? store.get(sessionId) : undefined;
  },

  findByRefreshToken(refreshToken: string): SessionRecord | undefined {
    const sessionId = refreshIndex.get(hashRefreshToken(refreshToken));
    return sessionId ? store.get(sessionId) : undefined;
  },

  listByUser(userId: string): SessionRecord[] {
    return [...(userIndex.get(userId) ?? [])].flatMap((id) => store.get(id) ?? []);
  },

  delete(sessionId: string): void {
    const session = store.get(sessionId);
    if (!session) return;
    refreshIndex.delete(session.refreshToken);
    accessIndex.delete(session.accessToken);
    removeFrom(userIndex, session.userId, sessionId);
    if (session.familyId) removeFrom(familyIndex, session.familyId, sessionId);
    store.delete(sessionId);
  },

  /** Rotation: removes the session and remembers the token hash so later reuse is detectable. */
  revokeByRefreshToken(refreshToken: string): void {
    const hash = hashRefreshToken(refreshToken);
    const sessionId = refreshIndex.get(hash);
    const session = sessionId ? store.get(sessionId) : undefined;
    if (session?.familyId) rotated.set(hash, session.familyId);
    if (sessionId) this.delete(sessionId);
  },

  /** Returns the family of a previously rotated refresh token, if it was rotated. */
  wasRotated(refreshToken: string): string | undefined {
    return rotated.get(hashRefreshToken(refreshToken));
  },

  revokeFamily(familyId: string): void {
    for (const sessionId of [...(familyIndex.get(familyId) ?? [])]) this.delete(sessionId);
  },

  isValid(sessionId: string): boolean {
    const session = store.get(sessionId);
    if (!session) return false;
    if (Math.floor(Date.now() / 1000) < session.expiresAt) return true;
    this.delete(sessionId); // expired sessions disappear on access
    return false;
  },

  /** Fallback sweep; expired sessions are also dropped lazily by isValid. */
  purgeExpired(): void {
    const now = Math.floor(Date.now() / 1000);
    for (const [id, session] of store) {
      if (session.expiresAt <= now) this.delete(id);
    }
  },

  _reset(): void {
    store.clear();
    refreshIndex.clear();
    accessIndex.clear();
    userIndex.clear();
    familyIndex.clear();
    rotated.clear();
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
