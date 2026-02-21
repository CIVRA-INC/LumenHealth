"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AuthTokens,
  AuthUser,
  clearTokens,
  decodeAccessTokenUser,
  isAccessTokenExpired,
  loadTokens,
  saveTokens,
} from "@/lib/auth-session";
import { configureApiClient } from "@/lib/api-client";

type AuthState = {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
};

type LoginCredentials = {
  email: string;
  password: string;
};

type AuthContextValue = AuthState & {
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

const parseTokensFromResponse = (raw: unknown): AuthTokens | null => {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const data = (raw as { data?: unknown }).data;
  if (!data || typeof data !== "object") {
    return null;
  }

  const accessToken = (data as { accessToken?: unknown }).accessToken;
  const refreshToken = (data as { refreshToken?: unknown }).refreshToken;

  if (typeof accessToken !== "string" || typeof refreshToken !== "string") {
    return null;
  }

  return { accessToken, refreshToken };
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    tokens: null,
    isLoading: true,
  });

  const logout = useCallback(() => {
    clearTokens();
    setState({ user: null, tokens: null, isLoading: false });
  }, []);

  const applyTokens = useCallback((tokens: AuthTokens | null) => {
    if (!tokens) {
      clearTokens();
      setState((prev) => ({ ...prev, user: null, tokens: null }));
      return;
    }

    const user = decodeAccessTokenUser(tokens.accessToken);
    if (!user) {
      clearTokens();
      setState((prev) => ({ ...prev, user: null, tokens: null }));
      return;
    }

    saveTokens(tokens);
    setState((prev) => ({ ...prev, user, tokens }));
  }, []);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    const refreshToken = state.tokens?.refreshToken;
    if (!refreshToken) {
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      logout();
      return null;
    }

    const payload = (await response.json()) as {
      data?: { accessToken?: string };
    };

    const newAccessToken = payload.data?.accessToken;
    if (!newAccessToken) {
      logout();
      return null;
    }

    const nextTokens: AuthTokens = {
      accessToken: newAccessToken,
      refreshToken,
    };

    applyTokens(nextTokens);
    return newAccessToken;
  }, [applyTokens, logout, state.tokens?.refreshToken]);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const tokens = parseTokensFromResponse(await response.json());
      if (!tokens) {
        throw new Error("Invalid login response");
      }

      applyTokens(tokens);
    },
    [applyTokens],
  );

  useEffect(() => {
    const storedTokens = loadTokens();

    if (!storedTokens) {
      setState({ user: null, tokens: null, isLoading: false });
      return;
    }

    if (isAccessTokenExpired(storedTokens.accessToken)) {
      setState((prev) => ({ ...prev, tokens: storedTokens, isLoading: false }));
      return;
    }

    const user = decodeAccessTokenUser(storedTokens.accessToken);
    if (!user) {
      clearTokens();
      setState({ user: null, tokens: null, isLoading: false });
      return;
    }

    setState({ user, tokens: storedTokens, isLoading: false });
  }, []);

  useEffect(() => {
    configureApiClient({
      getTokens: () => state.tokens,
      refreshAccessToken,
      onUnauthorized: logout,
    });
  }, [logout, refreshAccessToken, state.tokens]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isAuthenticated: Boolean(state.user && state.tokens),
      login,
      logout,
      refreshAccessToken,
    }),
    [login, logout, refreshAccessToken, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
};
