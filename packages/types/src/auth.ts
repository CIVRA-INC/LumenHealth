// Auth contract map — shared across api, web, mobile, and stellar-service.
// Closes #438

// ── Roles ────────────────────────────────────────────────────────────────────

export type UserRole = "owner" | "admin" | "clinician" | "cashier";

export type Permission =
  | "auth:read"
  | "auth:write"
  | "billing:read"
  | "billing:write"
  | "patient:read"
  | "patient:write"
  | "clinic:read"
  | "clinic:write"
  | "staff:read"
  | "staff:write";

export type RolePolicy = {
  role: UserRole;
  permissions: Permission[];
};

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

export type RegisterRequest = {
  email: string;
  password: string;
  clinicName: string;
};

export type RegisterResponse = {
  session: AuthSession;
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

// ── Events ───────────────────────────────────────────────────────────────────
// Closes #440

export type AuthEventType =
  | "auth.login.success"
  | "auth.login.failure"
  | "auth.logout"
  | "auth.token.refreshed"
  | "auth.token.expired"
  | "auth.recovery.requested"
  | "auth.recovery.completed"
  | "auth.account.locked";

export type AuthEvent = {
  type: AuthEventType;
  userId?: string;
  clinicId?: string;
  /** ISO-8601 timestamp */
  timestamp: string;
  meta?: Record<string, unknown>;
};

// ── Errors ───────────────────────────────────────────────────────────────────

export type AuthErrorCode =
  | "AUTH_MISSING_CREDENTIALS"
  | "AUTH_INVALID_CREDENTIALS"
  | "AUTH_TOKEN_EXPIRED"
  | "AUTH_TOKEN_INVALID"
  | "AUTH_FORBIDDEN"
  | "AUTH_ACCOUNT_LOCKED"
  | "AUTH_EMAIL_TAKEN";

export type AuthError = {
  error: AuthErrorCode;
  message: string;
};
