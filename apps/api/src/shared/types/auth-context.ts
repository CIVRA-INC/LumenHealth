import type { UserRole } from '@lumen/types';

/**
 * The caller's identity as resolved from the bearer token.
 *
 * Set on the request by `AuthGuard` (Nest) and by `resolveAuthContext`
 * (Express middleware); read through the `@AuthContext()` param decorator
 * rather than by reaching into `request.auth` from a controller.
 */
export type AuthContextType = {
  userId: string;
  clinicId: string;
  role: UserRole;
  accessToken: string;
};
