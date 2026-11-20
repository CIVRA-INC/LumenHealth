import type { AuthSession, UserRole } from "@lumen/types";

const SESSION_STORAGE_KEY = "lumenhealth.auth.session";

type Listener = () => void;

const listeners = new Set<Listener>();

// Exhaustive on purpose: adding a role to `UserRole` is a compile error until it is listed here.
const KNOWN_ROLES: Record<UserRole, true> = { owner: true, admin: true, clinician: true, cashier: true, system: true };

function hasWindow() {
  return typeof window !== "undefined";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/** Runtime check for a stored session; anything else (old schema, hand-edited, foreign app) is rejected. */
export function isAuthSession(value: unknown): value is AuthSession {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return (
    isNonEmptyString(candidate.userId) &&
    isNonEmptyString(candidate.clinicId) &&
    isNonEmptyString(candidate.accessToken) &&
    typeof candidate.role === "string" &&
    Object.prototype.hasOwnProperty.call(KNOWN_ROLES, candidate.role) &&
    (candidate.refreshToken === undefined || typeof candidate.refreshToken === "string")
  );
}

// ── Storage access ───────────────────────────────────────────────────────────
// `localStorage` can throw SecurityError (blocked storage, sandboxed frames) on any access and
// QuotaExceededError on writes. Every call goes through these helpers, which report failure
// instead of throwing.

function safeGetItem(): { available: true; raw: string | null } | { available: false } {
  try {
    return { available: true, raw: window.localStorage.getItem(SESSION_STORAGE_KEY) };
  } catch {
    return { available: false };
  }
}

function safeSetItem(value: string): boolean {
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemoveItem(): void {
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Nothing more to do: the in-memory copy is cleared by the caller.
  }
}

// ── Snapshot cache ───────────────────────────────────────────────────────────
// `useSyncExternalStore` requires `getSnapshot` to return the same reference while the store is
// unchanged, so the parsed session is cached against the raw string it came from.

const UNREAD = Symbol("unread");
let cachedRaw: string | null | typeof UNREAD = UNREAD;
let cachedSession: AuthSession | null = null;

/** Session kept for this tab only, used when storage is blocked or full. */
let memorySession: AuthSession | null = null;

function notifySessionChange() {
  listeners.forEach((listener) => listener());
}

export function getStoredAuthSession(): AuthSession | null {
  if (!hasWindow()) {
    return null;
  }

  const stored = safeGetItem();
  if (!stored.available || !stored.raw) {
    cachedRaw = UNREAD;
    cachedSession = null;
    return memorySession;
  }

  if (stored.raw === cachedRaw) {
    return cachedSession;
  }

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(stored.raw);
  } catch {
    parsed = null;
  }

  if (isAuthSession(parsed)) {
    cachedRaw = stored.raw;
    cachedSession = parsed;
    return parsed;
  }

  // Unparsable or wrong shape: drop it so it is never trusted or re-read.
  safeRemoveItem();
  cachedRaw = UNREAD;
  cachedSession = null;
  return memorySession;
}

/** Returns `true` when the session was persisted; `false` means it only lives in memory for this tab. */
export function setStoredAuthSession(session: AuthSession): boolean {
  if (!hasWindow()) {
    return false;
  }

  const raw = JSON.stringify(session);
  const persisted = safeSetItem(raw);
  if (persisted) {
    memorySession = null;
    cachedRaw = raw;
    cachedSession = session;
  } else {
    memorySession = session;
    cachedRaw = UNREAD;
    cachedSession = null;
  }
  notifySessionChange();
  return persisted;
}

export function clearStoredAuthSession() {
  if (!hasWindow()) {
    return;
  }

  safeRemoveItem();
  memorySession = null;
  cachedRaw = UNREAD;
  cachedSession = null;
  notifySessionChange();
}

export function subscribeToAuthSession(listener: Listener) {
  if (!hasWindow()) {
    return () => undefined;
  }

  listeners.add(listener);

  const handleStorage = (event: StorageEvent) => {
    if (event.key === SESSION_STORAGE_KEY || event.key === null) {
      listener();
    }
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function getServerAuthSession(): AuthSession | null {
  return null;
}

/** Test helper: forget cached and in-memory state. */
export function resetAuthSessionCacheForTests() {
  cachedRaw = UNREAD;
  cachedSession = null;
  memorySession = null;
  listeners.clear();
}
