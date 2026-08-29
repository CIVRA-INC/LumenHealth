import type { AuthError } from "@lumen/types";
import type { AccountStatus } from "../types/index.js";

const failedAttempts = new Map<string, number>();
const LOCK_THRESHOLD = 5;

export function recordFailedLoginAttempt(identityId: string): number {
  const attempts = (failedAttempts.get(identityId) ?? 0) + 1;
  failedAttempts.set(identityId, attempts);
  return attempts;
}

export function resetFailedLoginAttempts(identityId: string): void {
  failedAttempts.delete(identityId);
}

export function isAccountLocked(identityId: string): boolean {
  return (failedAttempts.get(identityId) ?? 0) >= LOCK_THRESHOLD;
}

export function accountStatusError(status: AccountStatus): AuthError | null {
  switch (status) {
    case "active":
      return null;
    case "pending":
      return { error: "AUTH_FORBIDDEN", message: "Account is pending activation" };
    case "suspended":
      return { error: "AUTH_FORBIDDEN", message: "Account has been suspended" };
    case "locked":
      return { error: "AUTH_ACCOUNT_LOCKED", message: "Account is locked due to repeated failed login attempts" };
  }
}
