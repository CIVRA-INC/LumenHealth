import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Permission, PlatformPermission } from '@lumen/contracts';
import { UnauthenticatedError } from './errors';
import type { AuthedRequest, PlatformContext, RequestContext } from './request-context';

export const IS_PUBLIC = 'lumen:public';
export const IS_AUTHENTICATED = 'lumen:authenticated';
export const ALLOW_PASSWORD_CHANGE = 'lumen:allow-password-change';
export const REQUIRED_PERMISSIONS = 'lumen:permissions';
export const REQUIRED_PLATFORM_PERMISSIONS = 'lumen:platform-permissions';
export const ANY_PRINCIPAL = 'lumen:any-principal';

/** Endpoint reachable without a session (login, health). */
export const Public = () => SetMetadata(IS_PUBLIC, true);
/** Any signed-in user may call this endpoint; no specific permission is needed. */
export const Authenticated = () => SetMetadata(IS_AUTHENTICATED, true);
/** Callable while the account still has to change its temporary password. */
export const AllowPendingPasswordChange = () => SetMetadata(ALLOW_PASSWORD_CHANGE, true);
/** The signed-in user needs every listed permission. */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(REQUIRED_PERMISSIONS, permissions);

/** Injects the authenticated request context. */
export const Ctx = createParamDecorator(
  (_data: unknown, host: ExecutionContext): RequestContext => {
    const ctx = host.switchToHttp().getRequest<AuthedRequest>().ctx;
    if (!ctx) throw new UnauthenticatedError();
    return ctx;
  },
);

/**
 * Platform administration. Only a platform-operator session holding every listed platform permission may
 * call it; an organisation session, whatever its role, is refused.
 */
export const RequirePlatformPermissions = (...permissions: PlatformPermission[]) =>
  SetMetadata(REQUIRED_PLATFORM_PERMISSIONS, permissions);
/** Any signed-in principal (organisation or platform) may call this: session, logout, password change. */
export const AnyPrincipal = () => SetMetadata(ANY_PRINCIPAL, true);

/** Injects the platform-operator context. Only reachable behind @RequirePlatformPermissions. */
export const PlatformCtx = createParamDecorator(
  (_data: unknown, host: ExecutionContext): PlatformContext => {
    const platform = host.switchToHttp().getRequest<AuthedRequest>().platform;
    if (!platform) throw new UnauthenticatedError();
    return platform;
  },
);
