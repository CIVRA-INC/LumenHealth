import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { serverConfig } from '@lumen/config';

@Injectable()
export class InternalServiceTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const token = req.header("x-internal-service-token");
    
    if (!token || token !== serverConfig.internalServiceToken) {
      throw new HttpException({ error: "UNAUTHORIZED", message: "invalid or missing internal service token" }, HttpStatus.UNAUTHORIZED);
    }
    
    return true;
  }
}
