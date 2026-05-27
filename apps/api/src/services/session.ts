/**
 * Session Service
 * Handles session lifecycle: creation, validation, expiration, cleanup
 */

export interface Session {
  id: string;
  userId: string;
  clinicId: string;
  role: string;
  accessToken: string;
  refreshToken: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
  ipAddress: string;
  userAgent: string;
}

export interface SessionConfig {
  accessTokenTTL: number;    // 15 minutes in ms
  refreshTokenTTL: number;   // 7 days in ms
  absoluteTimeout: number;   // 24 hours in ms
  inactivityTimeout: number; // 30 minutes in ms
  maxConcurrentSessions: number; // 5
}

const DEFAULT_CONFIG: SessionConfig = {
  accessTokenTTL: 15 * 60 * 1000,        // 15 minutes
  refreshTokenTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
  absoluteTimeout: 24 * 60 * 60 * 1000,   // 24 hours
  inactivityTimeout: 30 * 60 * 1000,      // 30 minutes
  maxConcurrentSessions: 5,
};

// In-memory session store (replace with Redis/DB in production)
const sessions = new Map<string, Session>();

/**
 * Create a new session
 */
export function createSession(
  userId: string,
  clinicId: string,
  role: string,
  ipAddress: string,
  userAgent: string,
  config: SessionConfig = DEFAULT_CONFIG
): Session {
  const now = new Date();
  const session: Session = {
    id: generateSessionId(),
    userId,
    clinicId,
    role,
    accessToken: generateToken(),
    refreshToken: generateToken(),
    createdAt: now,
    expiresAt: new Date(now.getTime() + config.absoluteTimeout),
    lastActivityAt: now,
    ipAddress,
    userAgent,
  };

  // Enforce max concurrent sessions
  enforceConcurrentSessionLimit(userId, config.maxConcurrentSessions);

  sessions.set(session.id, session);
  return session;
}

/**
 * Validate and refresh session activity
 */
export function validateSession(sessionId: string, config: SessionConfig = DEFAULT_CONFIG): Session | null {
  const session = sessions.get(sessionId);
  if (!session) return null;

  const now = new Date();

  // Check absolute expiration
  if (now > session.expiresAt) {
    deleteSession(sessionId);
    return null;
  }

  // Check inactivity timeout
  const inactivityCutoff = new Date(now.getTime() - config.inactivityTimeout);
  if (session.lastActivityAt < inactivityCutoff) {
    deleteSession(sessionId);
    return null;
  }

  // Update last activity
  session.lastActivityAt = now;
  return session;
}

/**
 * Refresh access token using refresh token
 */
export function refreshSession(
  refreshToken: string,
  config: SessionConfig = DEFAULT_CONFIG
): { accessToken: string; refreshToken: string } | null {
  const session = Array.from(sessions.values()).find(s => s.refreshToken === refreshToken);
  if (!session) return null;

  const now = new Date();

  // Check if session is expired
  if (now > session.expiresAt) {
    deleteSession(session.id);
    return null;
  }

  // Rotate tokens
  session.accessToken = generateToken();
  session.refreshToken = generateToken();
  session.lastActivityAt = now;

  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  };
}

/**
 * Delete a session
 */
export function deleteSession(sessionId: string): boolean {
  return sessions.delete(sessionId);
}

/**
 * Delete all sessions for a user
 */
export function deleteUserSessions(userId: string): number {
  let count = 0;
  for (const [id, session] of sessions.entries()) {
    if (session.userId === userId) {
      sessions.delete(id);
      count++;
    }
  }
  return count;
}

/**
 * Cleanup expired sessions
 */
export function cleanupExpiredSessions(): number {
  const now = new Date();
  let count = 0;

  for (const [id, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      sessions.delete(id);
      count++;
    }
  }

  return count;
}

/**
 * Enforce max concurrent sessions per user
 */
function enforceConcurrentSessionLimit(userId: string, maxSessions: number): void {
  const userSessions = Array.from(sessions.values())
    .filter(s => s.userId === userId)
    .sort((a, b) => a.lastActivityAt.getTime() - b.lastActivityAt.getTime());

  while (userSessions.length >= maxSessions) {
    const oldest = userSessions.shift()!;
    sessions.delete(oldest.id);
  }
}

/**
 * Generate a random session ID
 */
function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a random token
 */
function generateToken(): string {
  return Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2);
}

/**
 * Get session statistics
 */
export function getSessionStats(): {
  totalSessions: number;
  activeSessions: number;
  expiredSessions: number;
} {
  const now = new Date();
  let active = 0;
  let expired = 0;

  for (const session of sessions.values()) {
    if (now > session.expiresAt) {
      expired++;
    } else {
      active++;
    }
  }

  return {
    totalSessions: sessions.size,
    activeSessions: active,
    expiredSessions: expired,
  };
}
