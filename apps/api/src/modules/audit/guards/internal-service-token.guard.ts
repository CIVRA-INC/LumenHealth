import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '../../../shared/config/config.service.js';

@Injectable()
export class InternalServiceTokenGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const token = req.header("x-internal-service-token");

    if (!token || token !== this.config.internalServiceToken) {
      throw new HttpException({ error: "UNAUTHORIZED", message: "invalid or missing internal service token" }, HttpStatus.UNAUTHORIZED);
    }

    return true;
  }
}
