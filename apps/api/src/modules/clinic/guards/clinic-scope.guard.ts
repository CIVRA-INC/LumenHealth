import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { CLINIC_SCOPE_PARAM } from '../decorators/require-clinic-scope.decorator.js';

/**
 * Verifies the resource being accessed belongs to the caller's clinic.
 *
 * The param name to check comes from `@RequireClinicScope()` on the handler, then
 * the controller, then the fallback given by the `requireClinicScope()` factory,
 * and finally `"clinicId"`. If the param is absent the guard passes through — it
 * only enforces when the param is present and mismatched. That pass-through is
 * load-bearing: routes with no clinic param (e.g. `POST /clinics`) share this
 * controller, and the repository layer is responsible for 404 on cross-clinic IDs
 * it cannot see at this level.
 */
@Injectable()
export class ClinicScopeGuard implements CanActivate {
  private fallbackParamName = 'clinicId';

  constructor(private readonly reflector: Reflector) {}

  /**
   * Sets the param name used when the handler and controller carry no
   * `@RequireClinicScope()` metadata. Only the factory needs this; a guard
   * registered as a plain class is always driven by the decorator.
   */
  forParam(paramName: string): this {
    this.fallbackParamName = paramName;
    return this;
  }

  canActivate(context: ExecutionContext): boolean {
    const paramName =
      this.reflector.get<string>(CLINIC_SCOPE_PARAM, context.getHandler()) ??
      this.reflector.get<string>(CLINIC_SCOPE_PARAM, context.getClass()) ??
      this.fallbackParamName;

    const req = context.switchToHttp().getRequest<Request>();
    const resourceClinicId = req.params[paramName];

    if (resourceClinicId && resourceClinicId !== req.auth?.clinicId) {
      throw new HttpException(
        { error: 'AUTH_FORBIDDEN', message: 'cross-clinic access denied' },
        HttpStatus.FORBIDDEN,
      );
    }
    return true;
  }
}

/**
 * Guard-factory form of the check, for handlers that cannot carry decorator
 * metadata. Mirrors the old `requireClinicScope(paramName)` Express middleware,
 * including its absent-param pass-through.
 */
export function requireClinicScope(paramName = 'clinicId'): CanActivate {
  return new ClinicScopeGuard(new Reflector()).forParam(paramName);
}
