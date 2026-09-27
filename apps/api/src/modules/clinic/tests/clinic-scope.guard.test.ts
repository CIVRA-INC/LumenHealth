import { describe, it, expect } from 'vitest';
import { HttpException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ClinicScopeGuard, requireClinicScope } from '../guards/clinic-scope.guard.js';
import { RequireClinicScope } from '../decorators/require-clinic-scope.decorator.js';

type Handler = (...args: never[]) => unknown;

class ScopedController {
  @RequireClinicScope('clinicId')
  byDefault(): void {}

  @RequireClinicScope('resourceClinicId')
  byCustomName(): void {}
}

@RequireClinicScope('clinicId')
class ControllerLevelController {
  handler(): void {}
}

function contextFor(
  controller: object,
  handler: Handler,
  params: Record<string, string>,
  clinicId?: string,
): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () => ({
      getRequest: () =>
        ({
          params,
          auth: clinicId === undefined ? undefined : { clinicId },
        }) as unknown as Request,
    }),
  } as unknown as ExecutionContext;
}

function expectForbidden(run: () => boolean): void {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(HttpException);
    const exception = error as HttpException;
    expect(exception.getStatus()).toBe(403);
    expect(exception.getResponse()).toEqual({
      error: 'AUTH_FORBIDDEN',
      message: 'cross-clinic access denied',
    });
    return;
  }
  throw new Error('expected the guard to reject with 403');
}

describe('ClinicScopeGuard', () => {
  it('passes when the param matches the caller clinic', () => {
    const guard = requireClinicScope();
    const context = contextFor(ScopedController, ScopedController.prototype.byDefault, { clinicId: 'clinic-a' }, 'clinic-a');
    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects with 403 and the original message when the param mismatches', () => {
    const guard = requireClinicScope();
    const context = contextFor(ScopedController, ScopedController.prototype.byDefault, { clinicId: 'clinic-b' }, 'clinic-a');
    expectForbidden(() => guard.canActivate(context));
  });

  // The behaviour the migration must not "fix": a route with no clinic param is
  // not a scope violation, it is just not this guard's business.
  it('passes through when the param is absent', () => {
    const guard = requireClinicScope();
    const context = contextFor(ScopedController, ScopedController.prototype.byDefault, {}, 'clinic-a');
    expect(guard.canActivate(context)).toBe(true);
  });

  it('passes through when the param is present but empty', () => {
    const guard = requireClinicScope();
    const context = contextFor(ScopedController, ScopedController.prototype.byDefault, { clinicId: '' }, 'clinic-a');
    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects when the param is present but the caller has no auth context', () => {
    const guard = requireClinicScope();
    const context = contextFor(ScopedController, ScopedController.prototype.byDefault, { clinicId: 'clinic-a' }, undefined);
    expectForbidden(() => guard.canActivate(context));
  });

  it('reads a custom param name from the decorator', () => {
    const guard = requireClinicScope();
    const context = contextFor(ScopedController, ScopedController.prototype.byCustomName, { resourceClinicId: 'clinic-b' }, 'clinic-a');
    expectForbidden(() => guard.canActivate(context));
  });

  it('ignores clinicId when the decorator names a different param', () => {
    const guard = requireClinicScope();
    const context = contextFor(
      ScopedController,
      ScopedController.prototype.byCustomName,
      { clinicId: 'clinic-a', resourceClinicId: 'clinic-a' },
      'clinic-a',
    );
    expect(guard.canActivate(context)).toBe(true);
  });

  it('lets the decorator override the factory param name', () => {
    const guard = requireClinicScope('clinicId');
    const context = contextFor(ScopedController, ScopedController.prototype.byCustomName, { resourceClinicId: 'clinic-b' }, 'clinic-a');
    expectForbidden(() => guard.canActivate(context));
  });

  it('reads the param name from the controller when the handler has none', () => {
    const guard = requireClinicScope();
    const context = contextFor(ControllerLevelController, ControllerLevelController.prototype.handler, { clinicId: 'clinic-b' }, 'clinic-a');
    expectForbidden(() => guard.canActivate(context));
  });

  it('defaults to clinicId when no decorator is present', () => {
    const guard = new ClinicScopeGuard(new Reflector());
    const context = contextFor(ScopedController, (() => undefined) as Handler, { clinicId: 'clinic-b' }, 'clinic-a');
    expectForbidden(() => guard.canActivate(context));
  });
});

