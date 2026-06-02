// Closes #527
// API integration contract for mobile auth.
// Implements the login, refresh, and me calls defined in docs/auth-mobile-architecture.md.
// All types from @lumen/types; no runtime dependencies on other app workspaces.

import type {
  LoginRequest,
  LoginResponse,
  RefreshResponse,
  MeResponse,
  AuthError,
} from "@lumen/types";

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

async function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw data as AuthError;
  return data as T;
}

async function get<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw data as AuthError;
  return data as T;
}

export async function loginApi(credentials: LoginRequest): Promise<LoginResponse> {
  return post<LoginResponse>("/auth/login", credentials);
}

export async function refreshApi(refreshToken: string): Promise<RefreshResponse> {
  return post<RefreshResponse>("/auth/refresh", { refreshToken });
}

export async function meApi(accessToken: string): Promise<MeResponse> {
  return get<MeResponse>("/auth/me", accessToken);
}
