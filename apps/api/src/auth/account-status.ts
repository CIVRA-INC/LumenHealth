// Auth 028 — Account status handling for pending, active, suspended, and locked users
// Closes #463

import type { AuthError } from "@lumen/types";
import type { AccountStatus } from "./identity-store.js";

/**
 * Maps an account status to the AuthError that should be returned when
 * a user with that status attempts to authenticate.
 *
 * Returns `null` when the status permits access (i.e. "active").
 */
export function accountStatusError(status: AccountStatus): AuthError | null {
  switch (status) {
    case "active":
      return null;
    case "pending":
      return {
        error: "AUTH_FORBIDDEN",
        message: "Account is pending activation",
      };
    case "suspended":
      return {
        error: "AUTH_FORBIDDEN",
        message: "Account has been suspended",
      };
    case "locked":
      return {
        error: "AUTH_ACCOUNT_LOCKED",
        message: "Account is locked due to repeated failed login attempts",
      };
  }
}
