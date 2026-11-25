import type { Request } from 'express';
import type { Permission, PlatformPermission, PlatformRole, Role } from '@lumen/contracts';

/** The authenticated principal and its active tenant scope, derived server-side from the session. */
export interface RequestContext {
  userId: string;
  sessionId: string;
  membershipId: string;
  organizationId: string;
  timezone: string;
  role: Role;
  permissions: readonly Permission[];
  /** Branch the user is currently working in. */
  branchId: string;
  /** Every branch this membership may access. */
  accessibleBranchIds: readonly string[];
  mustChangePassword: boolean;
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

export interface AuthedRequest extends Request {
  ctx?: RequestContext;
  platform?: PlatformContext;
}

/**
 * A platform operator's principal. It deliberately shares nothing with {@link RequestContext}: there is
 * no organisation, membership or branch, so platform code cannot reach tenant data by accident.
 */
export interface PlatformContext {
  userId: string;
  sessionId: string;
  platformRole: PlatformRole;
  permissions: readonly PlatformPermission[];
  mustChangePassword: boolean;
  ip?: string;
  userAgent?: string;
  requestId?: string;
}
