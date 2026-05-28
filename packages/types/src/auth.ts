// Auth contract map — shared across api, web, mobile, and stellar-service.
// Closes #438

// ── Roles ────────────────────────────────────────────────────────────────────

export type UserRole = "owner" | "admin" | "clinician" | "cashier";

// ── Session ──────────────────────────────────────────────────────────────────

export type AuthSession = {
  userId: string;
  clinicId: string;
  role: UserRole;
  accessToken: string;
};

// ── Requests ─────────────────────────────────────────────────────────────────

export type LoginRequest = {
  email: string;
  password: string;
};

export type LogoutRequest = {
  accessToken: string;
};

export type RefreshRequest = {
  refreshToken: string;
};

// ── Responses ────────────────────────────────────────────────────────────────

export type LoginResponse = {
  session: AuthSession;
};

export type LogoutResponse = {
  ok: true;
};

export type RefreshResponse = {
  accessToken: string;
};

export type MeResponse = {
  userId: string;
  clinicId: string;
  role: UserRole;
  email: string;
};

// ── Errors ───────────────────────────────────────────────────────────────────

export type AuthErrorCode =
  | "AUTH_MISSING_CREDENTIALS"
  | "AUTH_INVALID_CREDENTIALS"
  | "AUTH_TOKEN_EXPIRED"
  | "AUTH_TOKEN_INVALID"
  | "AUTH_FORBIDDEN"
  | "AUTH_ACCOUNT_LOCKED";

export type AuthError = {
  error: AuthErrorCode;
  message: string;
};
