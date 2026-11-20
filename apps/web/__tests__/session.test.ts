import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthSession } from "@lumen/types";
import {
  clearStoredAuthSession,
  getStoredAuthSession,
  isAuthSession,
  resetAuthSessionCacheForTests,
  setStoredAuthSession,
  subscribeToAuthSession,
} from "../app/auth/session";

const KEY = "lumenhealth.auth.session";

const session: AuthSession = { userId: "u1", clinicId: "c1", role: "owner", accessToken: "tok" };

beforeEach(() => {
  window.localStorage.clear();
  resetAuthSessionCacheForTests();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("snapshot stability (#1495)", () => {
  it("returns the same reference while storage is unchanged", () => {
    window.localStorage.setItem(KEY, JSON.stringify(session));

    const first = getStoredAuthSession();
    const second = getStoredAuthSession();

    expect(first).toEqual(session);
    expect(second).toBe(first);
  });

  it("returns a new reference after setStoredAuthSession and notifies subscribers once", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToAuthSession(listener);
    setStoredAuthSession(session);
    const before = getStoredAuthSession();
    listener.mockClear();

    setStoredAuthSession({ ...session, accessToken: "tok-2" });
    const after = getStoredAuthSession();

    expect(after).not.toBe(before);
    expect(after?.accessToken).toBe("tok-2");
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("picks up changes made by another tab", () => {
    window.localStorage.setItem(KEY, JSON.stringify(session));
    const before = getStoredAuthSession();

    window.localStorage.setItem(KEY, JSON.stringify({ ...session, accessToken: "other-tab" }));

    expect(getStoredAuthSession()).not.toBe(before);
    expect(getStoredAuthSession()?.accessToken).toBe("other-tab");
  });

  it("does not log a React getSnapshot warning for consecutive reads", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    window.localStorage.setItem(KEY, JSON.stringify(session));
    getStoredAuthSession();
    getStoredAuthSession();
    expect(error).not.toHaveBeenCalled();
  });

  it("clears the cache and notifies when the session is cleared", () => {
    setStoredAuthSession(session);
    const listener = vi.fn();
    subscribeToAuthSession(listener);

    clearStoredAuthSession();

    expect(getStoredAuthSession()).toBeNull();
    expect(window.localStorage.getItem(KEY)).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("shape validation (#1496)", () => {
  it("round-trips a valid session unchanged, with or without a refresh token", () => {
    setStoredAuthSession(session);
    expect(getStoredAuthSession()).toEqual(session);

    const withRefresh = { ...session, refreshToken: "ref" };
    setStoredAuthSession(withRefresh);
    expect(getStoredAuthSession()).toEqual(withRefresh);
  });

  it.each([
    ["null", "null"],
    ["number", "123"],
    ["array", "[]"],
    ["empty object", "{}"],
    ["missing token", JSON.stringify({ userId: "u", clinicId: "c", role: "owner" })],
    ["empty userId", JSON.stringify({ ...session, userId: "" })],
    ["wrong-typed clinicId", JSON.stringify({ ...session, clinicId: 7 })],
    ["unknown role", JSON.stringify({ ...session, role: "superuser" })],
    ["inherited role name", JSON.stringify({ ...session, role: "toString" })],
    ["wrong-typed refresh token", JSON.stringify({ ...session, refreshToken: 5 })],
    ["not JSON", "{oops"],
  ])("rejects %s, returns null and removes the key", (_label, raw) => {
    window.localStorage.setItem(KEY, raw);

    expect(getStoredAuthSession()).toBeNull();
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it("exposes the guard", () => {
    expect(isAuthSession(session)).toBe(true);
    expect(isAuthSession(undefined)).toBe(false);
  });
});

describe("blocked and full storage (#1497)", () => {
  const securityError = () => {
    throw new DOMException("blocked", "SecurityError");
  };

  it("renders signed out when reading storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(securityError);
    expect(getStoredAuthSession()).toBeNull();
  });

  it("does not throw when removing throws", () => {
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(securityError);
    expect(() => clearStoredAuthSession()).not.toThrow();
  });

  it("keeps a working in-memory session when storage is full, and still notifies subscribers", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    const listener = vi.fn();
    subscribeToAuthSession(listener);

    let persisted = true;
    expect(() => {
      persisted = setStoredAuthSession(session);
    }).not.toThrow();

    expect(persisted).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
    const first = getStoredAuthSession();
    expect(first).toEqual(session);
    expect(getStoredAuthSession()).toBe(first);
  });

  it("keeps the in-memory session when reads also throw, and clears it on sign out", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(securityError);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(securityError);
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(securityError);

    expect(setStoredAuthSession(session)).toBe(false);
    expect(getStoredAuthSession()).toEqual(session);

    clearStoredAuthSession();
    expect(getStoredAuthSession()).toBeNull();
  });

  it("reports true when the session was persisted", () => {
    expect(setStoredAuthSession(session)).toBe(true);
  });
});
