import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { oneTimeTokens } from "../repositories/one-time-token.repository.js";
import { sessionStore, type SessionRecord } from "../repositories/session.repository.js";

const T0 = new Date("2026-01-01T00:00:00.000Z");

const session = (sessionId: string, expiresAt: number): SessionRecord => ({
  sessionId,
  userId: "u1",
  clinicId: "c1",
  accessToken: `access-${sessionId}`,
  refreshToken: `refresh-${sessionId}`,
  expiresAt,
  createdAt: T0.toISOString(),
});

describe("time-controlled expiry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    sessionStore._reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("sessions", () => {
    const expiry = Math.floor(T0.getTime() / 1000) + 60; // seconds

    it("is valid just before expiry, invalid exactly at expiry and after", () => {
      sessionStore.save(session("s1", expiry));
      vi.setSystemTime(new Date(T0.getTime() + 59_000));
      expect(sessionStore.isValid("s1")).toBe(true);

      vi.setSystemTime(new Date(T0.getTime() + 60_000));
      expect(sessionStore.isValid("s1")).toBe(false);
      // an expired session is dropped on access
      expect(sessionStore.findBySessionId("s1")).toBeUndefined();
    });

    it("purgeExpired removes expired sessions and keeps live ones", () => {
      sessionStore.save(session("expired", expiry));
      sessionStore.save(session("live", expiry + 3600));
      vi.setSystemTime(new Date(T0.getTime() + 61_000));

      sessionStore.purgeExpired();

      expect(sessionStore.findBySessionId("expired")).toBeUndefined();
      expect(sessionStore.findBySessionId("live")).toBeDefined();
    });
  });

  describe("one-time tokens", () => {
    it("a password-reset token (15 min) works before its TTL and not at or after it", () => {
      const token = oneTimeTokens.issue("u1", "password_reset", 15 * 60_000);

      vi.setSystemTime(new Date(T0.getTime() + 15 * 60_000 - 1));
      expect(oneTimeTokens.find(token, "password_reset")).toBeDefined();

      vi.setSystemTime(new Date(T0.getTime() + 15 * 60_000));
      expect(oneTimeTokens.find(token, "password_reset")).toBeUndefined();
    });

    it("an email-verify token (24 h) works before its TTL and not after it", () => {
      const token = oneTimeTokens.issue("u1", "email_verify", 24 * 60 * 60_000);

      vi.setSystemTime(new Date(T0.getTime() + 24 * 60 * 60_000 - 1));
      expect(oneTimeTokens.find(token, "email_verify")).toBeDefined();

      vi.setSystemTime(new Date(T0.getTime() + 24 * 60 * 60_000 + 1));
      expect(oneTimeTokens.find(token, "email_verify")).toBeUndefined();
    });

    it("an expired token cannot be consumed", () => {
      const token = oneTimeTokens.issue("u1", "password_reset", 1000);
      vi.setSystemTime(new Date(T0.getTime() + 2000));
      expect(oneTimeTokens.consume(token, "password_reset")).toBeUndefined();
    });
  });
});
