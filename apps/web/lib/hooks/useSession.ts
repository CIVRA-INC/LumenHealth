"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadTokens,
  clearTokens,
  decodeAccessTokenUser,
  isAccessTokenExpired,
  type AuthUser,
} from "@/lib/auth-session";

type SessionStatus = "active" | "expired" | "none";

interface SessionState {
  user: AuthUser | null;
  status: SessionStatus;
  /** Revoke the local session and clear stored tokens */
  revoke: () => void;
  /** Re-evaluate the stored token without a network call */
  refresh: () => void;
}

/**
 * useSession – lightweight hook for operator-facing session management.
 * Reads from localStorage, derives status from the JWT exp claim,
 * and exposes a revoke action for admin/settings workflows.
 */
export function useSession(): SessionState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<SessionStatus>("none");

  const evaluate = useCallback(() => {
    const tokens = loadTokens();
    if (!tokens) {
      setUser(null);
      setStatus("none");
      return;
    }

    if (isAccessTokenExpired(tokens.accessToken)) {
      setUser(null);
      setStatus("expired");
      return;
    }

    const decoded = decodeAccessTokenUser(tokens.accessToken);
    setUser(decoded);
    setStatus(decoded ? "active" : "expired");
  }, []);

  useEffect(() => {
    evaluate();
  }, [evaluate]);

  const revoke = useCallback(() => {
    clearTokens();
    setUser(null);
    setStatus("none");
  }, []);

  return { user, status, revoke, refresh: evaluate };
}
