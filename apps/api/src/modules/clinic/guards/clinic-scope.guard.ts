import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class ClinicScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const clinicId = req.params.clinicId;

    if (clinicId && clinicId !== req.auth?.clinicId) {
      throw new HttpException({ error: "AUTH_FORBIDDEN", message: "cross-clinic access denied" }, HttpStatus.FORBIDDEN);
    }
    return true;
  }
}
