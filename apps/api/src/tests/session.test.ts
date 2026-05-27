/**
 * Session Service Tests
 * Tests for token expiry, revocation, and refresh functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createSession,
  validateSession,
  refreshSession,
  deleteSession,
  deleteUserSessions,
  cleanupExpiredSessions,
  getSessionStats,
} from "../services/session";

describe("Session Service", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("createSession", () => {
    it("should create a session with all required fields", () => {
      const session = createSession("user1", "clinic1", "owner", "127.0.0.1", "test-agent");

      expect(session.id).toBeDefined();
      expect(session.userId).toBe("user1");
      expect(session.clinicId).toBe("clinic1");
      expect(session.role).toBe("owner");
      expect(session.accessToken).toBeDefined();
      expect(session.refreshToken).toBeDefined();
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.expiresAt).toBeInstanceOf(Date);
      expect(session.lastActivityAt).toBeInstanceOf(Date);
      expect(session.ipAddress).toBe("127.0.0.1");
      expect(session.userAgent).toBe("test-agent");
    });

    it("should set absolute expiration to 24 hours from now", () => {
      const now = new Date("2026-05-27T12:00:00Z");
      vi.setSystemTime(now);

      const session = createSession("user1", "clinic1", "owner", "127.0.0.1", "test-agent");

      const expectedExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      expect(session.expiresAt).toEqual(expectedExpiry);
    });

    it("should enforce max concurrent sessions (5)", () => {
      const userId = "user1";

      // Create 6 sessions
      for (let i = 0; i < 6; i++) {
        createSession(userId, "clinic1", "owner", "127.0.0.1", "test-agent");
      }

      const stats = getSessionStats();
      // Should only have 5 sessions for this user (oldest removed)
      expect(stats.totalSessions).toBeLessThanOrEqual(5);
    });

    it("should not affect other users' sessions when enforcing limit", () => {
      // Create 3 sessions for user1
      for (let i = 0; i < 3; i++) {
        createSession("user1", "clinic1", "owner", "127.0.0.1", "test-agent");
      }

      // Create 3 sessions for user2
      for (let i = 0; i < 3; i++) {
        createSession("user2", "clinic1", "clinician", "127.0.0.1", "test-agent");
      }

      const stats = getSessionStats();
      expect(stats.totalSessions).toBe(6);
    });
  });

  describe("validateSession", () => {
    it("should return session if valid and not expired", () => {
      const session = createSession("user1", "clinic1", "owner", "127.0.0.1", "test-agent");

      const validated = validateSession(session.id);

      expect(validated).toBeDefined();
      expect(validated!.id).toBe(session.id);
    });

    it("should return null for non-existent session", () => {
      const validated = validateSession("non-existent-id");
      expect(validated).toBeNull();
    });

    it("should return null for expired session (absolute timeout)", () => {
      const now = new Date("2026-05-27T12:00:00Z");
      vi.setSystemTime(now);

      const session = createSession("user1", "clinic1", "owner", "127.0.0.1", "test-agent");

      // Move 25 hours forward (past 24h absolute timeout)
      vi.setSystemTime(new Date(now.getTime() + 25 * 60 * 60 * 1000));

      const validated = validateSession(session.id);
      expect(validated).toBeNull();
    });

    it("should return null for inactive session (inactivity timeout)", () => {
      const now = new Date("2026-05-27T12:00:00Z");
      vi.setSystemTime(now);

      const session = createSession("user1", "clinic1", "owner", "127.0.0.1", "test-agent");

      // Move 31 minutes forward (past 30min inactivity timeout)
      vi.setSystemTime(new Date(now.getTime() + 31 * 60 * 1000));

      const validated = validateSession(session.id);
      expect(validated).toBeNull();
    });

    it("should update lastActivityAt on successful validation", () => {
      const now = new Date("2026-05-27T12:00:00Z");
      vi.setSystemTime(now);

      const session = createSession("user1", "clinic1", "owner", "127.0.0.1", "test-agent");

      // Move 10 minutes forward
      vi.setSystemTime(new Date(now.getTime() + 10 * 60 * 1000));

      const validated = validateSession(session.id);
      expect(validated).toBeDefined();
      expect(validated!.lastActivityAt).toEqual(new Date(now.getTime() + 10 * 60 * 1000));
    });

    it("should return session if within inactivity window", () => {
      const now = new Date("2026-05-27T12:00:00Z");
      vi.setSystemTime(now);

      const session = createSession("user1", "clinic1", "owner", "127.0.0.1", "test-agent");

      // Move 29 minutes forward (within 30min inactivity timeout)
      vi.setSystemTime(new Date(now.getTime() + 29 * 60 * 1000));

      const validated = validateSession(session.id);
      expect(validated).toBeDefined();
    });
  });

  describe("refreshSession", () => {
    it("should return new tokens if refresh token is valid", () => {
      const session = createSession("user1", "clinic1", "owner", "127.0.0.1", "test-agent");

      const result = refreshSession(session.refreshToken);

      expect(result).toBeDefined();
      expect(result!.accessToken).not.toBe(session.accessToken);
      expect(result!.refreshToken).not.toBe(session.refreshToken);
    });

    it("should return null for invalid refresh token", () => {
      const result = refreshSession("invalid-token");
      expect(result).toBeNull();
    });

    it("should return null for expired session", () => {
      const now = new Date("2026-05-27T12:00:00Z");
      vi.setSystemTime(now);

      const session = createSession("user1", "clinic1", "owner", "127.0.0.1", "test-agent");

      // Move 25 hours forward (past 24h absolute timeout)
      vi.setSystemTime(new Date(now.getTime() + 25 * 60 * 60 * 1000));

      const result = refreshSession(session.refreshToken);
      expect(result).toBeNull();
    });

    it("should update lastActivityAt on refresh", () => {
      const now = new Date("2026-05-27T12:00:00Z");
      vi.setSystemTime(now);

      const session = createSession("user1", "clinic1", "owner", "127.0.0.1", "test-agent");

      // Move 10 minutes forward
      vi.setSystemTime(new Date(now.getTime() + 10 * 60 * 1000));

      refreshSession(session.refreshToken);

      const validated = validateSession(session.id);
      expect(validated!.lastActivityAt).toEqual(new Date(now.getTime() + 10 * 60 * 1000));
    });
  });

  describe("deleteSession", () => {
    it("should delete session and return true", () => {
      const session = createSession("user1", "clinic1", "owner", "127.0.0.1", "test-agent");

      const deleted = deleteSession(session.id);

      expect(deleted).toBe(true);
      expect(validateSession(session.id)).toBeNull();
    });

    it("should return false for non-existent session", () => {
      const deleted = deleteSession("non-existent-id");
      expect(deleted).toBe(false);
    });
  });

  describe("deleteUserSessions", () => {
    it("should delete all sessions for a user", () => {
      // Create 3 sessions for user1
      for (let i = 0; i < 3; i++) {
        createSession("user1", "clinic1", "owner", "127.0.0.1", "test-agent");
      }

      // Create 2 sessions for user2
      for (let i = 0; i < 2; i++) {
        createSession("user2", "clinic1", "clinician", "127.0.0.1", "test-agent");
      }

      const deleted = deleteUserSessions("user1");

      expect(deleted).toBe(3);

      const stats = getSessionStats();
      expect(stats.totalSessions).toBe(2); // Only user2's sessions remain
    });

    it("should return 0 if user has no sessions", () => {
      const deleted = deleteUserSessions("no-sessions-user");
      expect(deleted).toBe(0);
    });
  });

  describe("cleanupExpiredSessions", () => {
    it("should remove expired sessions", () => {
      const now = new Date("2026-05-27T12:00:00Z");
      vi.setSystemTime(now);

      // Create 3 sessions
      createSession("user1", "clinic1", "owner", "127.0.0.1", "test-agent");
      createSession("user2", "clinic1", "clinician", "127.0.0.1", "test-agent");
      createSession("user3", "clinic1", "cashier", "127.0.0.1", "test-agent");

      // Move 25 hours forward (past 24h absolute timeout)
      vi.setSystemTime(new Date(now.getTime() + 25 * 60 * 60 * 1000));

      const cleaned = cleanupExpiredSessions();

      expect(cleaned).toBe(3);

      const stats = getSessionStats();
      expect(stats.totalSessions).toBe(0);
    });

    it("should not remove valid sessions", () => {
      const now = new Date("2026-05-27T12:00:00Z");
      vi.setSystemTime(now);

      // Create 3 sessions
      createSession("user1", "clinic1", "owner", "127.0.0.1", "test-agent");
      createSession("user2", "clinic1", "clinician", "127.0.0.1", "test-agent");
      createSession("user3", "clinic1", "cashier", "127.0.0.1", "test-agent");

      // Move only 1 hour forward (within 24h timeout)
      vi.setSystemTime(new Date(now.getTime() + 60 * 60 * 1000));

      const cleaned = cleanupExpiredSessions();

      expect(cleaned).toBe(0);

      const stats = getSessionStats();
      expect(stats.totalSessions).toBe(3);
    });

    it("should return 0 if no sessions to clean", () => {
      const cleaned = cleanupExpiredSessions();
      expect(cleaned).toBe(0);
    });
  });

  describe("getSessionStats", () => {
    it("should return correct stats", () => {
      const now = new Date("2026-05-27T12:00:00Z");
      vi.setSystemTime(now);

      // Create 3 sessions
      createSession("user1", "clinic1", "owner", "127.0.0.1", "test-agent");
      createSession("user2", "clinic1", "clinician", "127.0.0.1", "test-agent");
      createSession("user3", "clinic1", "cashier", "127.0.0.1", "test-agent");

      const stats = getSessionStats();

      expect(stats.totalSessions).toBe(3);
      expect(stats.activeSessions).toBe(3);
      expect(stats.expiredSessions).toBe(0);
    });

    it("should count expired sessions separately", () => {
      const now = new Date("2026-05-27T12:00:00Z");
      vi.setSystemTime(now);

      // Create 3 sessions
      createSession("user1", "clinic1", "owner", "127.0.0.1", "test-agent");
      createSession("user2", "clinic1", "clinician", "127.0.0.1", "test-agent");
      createSession("user3", "clinic1", "cashier", "127.0.0.1", "test-agent");

      // Move 25 hours forward (past 24h absolute timeout)
      vi.setSystemTime(new Date(now.getTime() + 25 * 60 * 60 * 1000));

      const stats = getSessionStats();

      expect(stats.totalSessions).toBe(3);
      expect(stats.activeSessions).toBe(0);
      expect(stats.expiredSessions).toBe(3);
    });
  });
});
