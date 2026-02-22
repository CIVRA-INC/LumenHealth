export type AuthUser = {
  userId: string;
  role: string;
  clinicId: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

const AUTH_STORAGE_KEY = "lumen.auth.tokens";

const parseJwtPayload = (token: string): Record<string, unknown> | null => {
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
};

export const decodeAccessTokenUser = (accessToken: string): AuthUser | null => {
  const payload = parseJwtPayload(accessToken);
  if (!payload) {
    return null;
  }

  const userId = payload.userId;
  const role = payload.role;
  const clinicId = payload.clinicId;
  const tokenType = payload.tokenType;

  if (
    typeof userId !== "string" ||
    typeof role !== "string" ||
    typeof clinicId !== "string" ||
    tokenType !== "access"
  ) {
    return null;
  }

  return { userId, role, clinicId };
};

export const isAccessTokenExpired = (accessToken: string): boolean => {
  const payload = parseJwtPayload(accessToken);
  if (!payload || typeof payload.exp !== "number") {
    return true;
  }

  return Date.now() >= payload.exp * 1000;
};

export const saveTokens = (tokens: AuthTokens): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(tokens));
};

export const loadTokens = (): AuthTokens | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AuthTokens>;
    if (
      typeof parsed.accessToken !== "string" ||
      typeof parsed.refreshToken !== "string"
    ) {
      return null;
    }

    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
    };
  } catch {
    return null;
  }
};

export const clearTokens = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
};
