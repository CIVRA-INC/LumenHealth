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

/**
 * Returns the value as-is if it is already a structured `AuthError`, otherwise
 * `null`. Unknown/unexpected throwables are intentionally NOT coerced into an
 * `AUTH_TOKEN_INVALID` with the raw `err.message`: doing so both leaked
 * internal exception text to clients and mislabeled unrelated failures as a
 * token problem (see issue #1014). Callers should treat `null` as "unexpected
 * server error" — log it server-side and return a generic 500.
 */
export function normalizeAuthError(err: unknown): AuthError | null {
  return isAuthError(err) ? err : null;
}

function isAuthError(value: unknown): value is AuthError {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    "message" in value
  );
}
