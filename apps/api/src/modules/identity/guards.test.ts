import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { UnauthenticatedError } from '../../common/errors';
import type { AuthedRequest, RequestContext } from '../../common/request-context';
import type { AppConfig } from '../../config/env';
import { AuthGuard } from './guards';
import type { SessionService } from './session.service';

const TOKEN = 'previously-issued-token';

const ctx: RequestContext = {
  userId: '22222222-2222-4222-8222-222222222222',
  sessionId: '11111111-1111-4111-8111-111111111111',
  membershipId: '33333333-3333-4333-8333-333333333333',
  organizationId: '44444444-4444-4444-8444-444444444444',
  timezone: 'Africa/Lagos',
  role: 'NURSE',
  permissions: ['patients.read'],
  branchId: '55555555-5555-4555-8555-555555555555',
  accessibleBranchIds: ['55555555-5555-4555-8555-555555555555'],
  mustChangePassword: false,
};

const config = { SESSION_COOKIE_NAME: 'lh_session' } as AppConfig;

function makeGuard(resolved: RequestContext | null) {
  const sessions = { resolve: vi.fn().mockResolvedValue(resolved) };
  return {
    sessions,
    guard: new AuthGuard(new Reflector(), sessions as unknown as SessionService, config),
  };
}

function executionContext() {
  const handler = () => undefined;
  class TestController {}
  const req: AuthedRequest = {
    cookies: { lh_session: TOKEN },
    headers: { 'user-agent': 'vitest' },
    ip: '127.0.0.1',
    id: 'request-1',
  } as unknown as AuthedRequest;
  const context = {
    getHandler: () => handler,
    getClass: () => TestController,
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  return { context, req };
}

describe('AuthGuard (#1457)', () => {
  it('assigns a request context for a valid session', async () => {
    const { guard: authGuard, sessions } = makeGuard(ctx);
    const { context, req } = executionContext();

    await expect(authGuard.canActivate(context)).resolves.toBe(true);
    expect(sessions.resolve).toHaveBeenCalledWith(TOKEN);
    expect(req.ctx).toMatchObject({ userId: ctx.userId });
    expect(req.ctx?.userAgent).toBe('vitest');
  });

  it('refuses a guarded route when the deactivated identity no longer resolves', async () => {
    const { guard: authGuard } = makeGuard(null);
    const { context, req } = executionContext();

    await expect(authGuard.canActivate(context)).rejects.toBeInstanceOf(UnauthenticatedError);
    expect(req.ctx).toBeUndefined();
  });
});
