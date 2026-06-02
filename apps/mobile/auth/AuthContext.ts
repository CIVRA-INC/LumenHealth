// Mobile auth session context — closes #527
// Holds session state, exposes login/logout/rehydrate per docs/auth-mobile-architecture.md.
// Typed against @lumen/types; no imports from other app workspaces.

import type { AuthSession, AuthError } from "@lumen/types";
import { loginApi, meApi, refreshApi } from "./loginApi.js";

export type AuthState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; session: AuthSession };

// Minimal token storage interface — platform adapter (Expo SecureStore / RN Keychain) plugs in here.
export interface TokenStorage {
  getRefreshToken(): Promise<string | null>;
  setRefreshToken(token: string): Promise<void>;
  clearRefreshToken(): Promise<void>;
}

export type AuthContextValue = {
  state: AuthState;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  rehydrate(): Promise<void>;
};

// In-memory access token — never persisted.
let _accessToken: string | null = null;
let _refreshToken: string | null = null;

export function createAuthContext(
  storage: TokenStorage,
  setState: (s: AuthState) => void
): AuthContextValue {
  async function rehydrate() {
    setState({ status: "loading" });
    const stored = await storage.getRefreshToken();
    if (!stored) {
      setState({ status: "unauthenticated" });
      return;
    }
    try {
      const { accessToken } = await refreshApi(stored);
      _accessToken = accessToken;
      const me = await meApi(accessToken);
      setState({
        status: "authenticated",
        session: { userId: me.userId, clinicId: me.clinicId, role: me.role, accessToken },
      });
    } catch (err) {
      const authErr = err as AuthError;
      if (authErr.error === "AUTH_TOKEN_INVALID" || authErr.error === "AUTH_TOKEN_EXPIRED") {
        await storage.clearRefreshToken();
      }
      setState({ status: "unauthenticated" });
    }
  }

  async function login(email: string, password: string) {
    const { session } = await loginApi({ email, password });
    _accessToken = session.accessToken;
    // refreshToken is in the session only if the API returns it; store when present
    if ("refreshToken" in (session as object & { refreshToken?: string })) {
      _refreshToken = (session as unknown as { refreshToken: string }).refreshToken;
      await storage.setRefreshToken(_refreshToken);
    }
    setState({ status: "authenticated", session });
  }

  async function logout() {
    _accessToken = null;
    _refreshToken = null;
    await storage.clearRefreshToken();
    setState({ status: "unauthenticated" });
  }

  return { state: { status: "loading" }, login, logout, rehydrate };
}

// Accessor for internal use by loginApi's interceptor pattern.
export function getAccessToken(): string | null {
  return _accessToken;
}
