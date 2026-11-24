import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Permission } from '@lumen/contracts';
import { UnauthenticatedError } from './errors';
import type { AuthedRequest, RequestContext } from './request-context';

export const IS_PUBLIC = 'lumen:public';
export const IS_AUTHENTICATED = 'lumen:authenticated';
export const ALLOW_PASSWORD_CHANGE = 'lumen:allow-password-change';
export const REQUIRED_PERMISSIONS = 'lumen:permissions';

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
