import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthContextType } from '../types/auth-context.js';

/**
 * Injects the auth context that `AuthGuard` resolved from the bearer token.
 *
 * Usage:
 *   @Get('me')
 *   @UseGuards(AuthGuard)
 *   me(@AuthContext() auth: AuthContextType) { ... }
 *
 * Only valid on routes guarded by `AuthGuard` (or `resolveAuthContext`): guards
 * run before the handler, so the context is present by the time the param
 * decorator is evaluated. There is no `undefined` case to handle here — the
 * non-null assertion stays in this one place instead of in every controller.
 */
export const AuthContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthContextType =>
    ctx.switchToHttp().getRequest<Request>().auth!,
);
