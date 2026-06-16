import type { AuthError, AuthErrorCode } from "@lumen/types";

const HTTP_STATUS: Record<AuthErrorCode, number> = {
  AUTH_MISSING_CREDENTIALS: 400,
  AUTH_INVALID_CREDENTIALS: 401,
  AUTH_TOKEN_EXPIRED: 401,
  AUTH_TOKEN_INVALID: 401,
  AUTH_FORBIDDEN: 403,
  AUTH_ACCOUNT_LOCKED: 423,
  AUTH_EMAIL_TAKEN: 409,
};

export function authErrorStatus(code: AuthErrorCode): number {
  return HTTP_STATUS[code];
}

export function normalizeAuthError(err: unknown): AuthError {
  if (isAuthError(err)) return err;
  const message = err instanceof Error ? err.message : "unexpected auth error";
  return { error: "AUTH_TOKEN_INVALID", message };
}

function isAuthError(value: unknown): value is AuthError {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    "message" in value
  );
}
