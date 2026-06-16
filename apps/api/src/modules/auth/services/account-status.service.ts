import type { AuthError } from "@lumen/types";
import type { AccountStatus } from "../types/index.js";

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
