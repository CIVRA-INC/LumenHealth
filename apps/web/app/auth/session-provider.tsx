"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import type { AuthSession } from "@lumen/types";
import {
  clearStoredAuthSession,
  getServerAuthSession,
  getStoredAuthSession,
  setStoredAuthSession,
  subscribeToAuthSession,
} from "./session";

type AuthSessionContextValue = {
  session: AuthSession | null;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(
    subscribeToAuthSession,
    getStoredAuthSession,
    getServerAuthSession
  );

  const value = useMemo<AuthSessionContextValue>(
    () => ({
      session,
      setSession: setStoredAuthSession,
      clearSession: clearStoredAuthSession,
    }),
    [session]
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession() {
  const context = useContext(AuthSessionContext);

  if (!context) {
    throw new Error("useAuthSession must be used within AuthSessionProvider");
  }

  return context;
}
