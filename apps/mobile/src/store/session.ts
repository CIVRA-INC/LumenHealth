import type { AuthSession } from "@lumen/types";

type Listener = () => void;

let currentSession: AuthSession | null = null;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l());
}

export function getSession(): AuthSession | null {
  return currentSession;
}

export function setSession(session: AuthSession): void {
  currentSession = session;
  notify();
}

export function clearSession(): void {
  currentSession = null;
  notify();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
