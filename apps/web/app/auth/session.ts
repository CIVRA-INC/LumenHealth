import type { AuthSession } from "@lumen/types";

const SESSION_STORAGE_KEY = "lumenhealth.auth.session";

type Listener = () => void;

const listeners = new Set<Listener>();

function hasWindow() {
  return typeof window !== "undefined";
}

function notifySessionChange() {
  listeners.forEach((listener) => listener());
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
  notifySessionChange();
}

export function clearStoredAuthSession() {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
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
