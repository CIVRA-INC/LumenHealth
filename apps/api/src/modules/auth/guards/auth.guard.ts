import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import type { UserRole } from '@lumen/types';
import { accessTokenSigner } from '../services/token.service.js';
import { identityStore } from '../repositories/identity.repository.js';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException({ error: "AUTH_UNAUTHORIZED", message: 'missing bearer token' });
    }
    const token = auth.slice('Bearer '.length);
    const claims = accessTokenSigner.verify(token);
    if (!claims) {
      throw new UnauthorizedException({ error: "AUTH_UNAUTHORIZED", message: 'expired or invalid token' });
    }
    if (!claims.clinicId) {
      throw new UnauthorizedException({ error: "AUTH_UNAUTHORIZED", message: 'token missing clinic scope' });
    }

    const identity = identityStore.findById(claims.sub);
    req.auth = {
      userId: claims.sub,
      clinicId: claims.clinicId,
      role: (identity?.role ?? claims.role) as UserRole,
      accessToken: token,
    };
    return true;
  }
}
