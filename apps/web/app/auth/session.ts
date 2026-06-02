import type { AuthSession } from "@lumen/types";

const SESSION_STORAGE_KEY = "lumenhealth.auth.session";

function hasWindow() {
  return typeof window !== "undefined";
}

export function getStoredAuthSession(): AuthSession | null {
  if (!hasWindow()) {
    return null;
  }

  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export function setStoredAuthSession(session: AuthSession) {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredAuthSession() {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}
