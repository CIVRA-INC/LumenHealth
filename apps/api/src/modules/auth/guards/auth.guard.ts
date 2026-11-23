import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import type { UserRole } from '@lumen/types';
import { accessTokenSigner } from '../services/token.service.js';
import { identityStore } from '../repositories/identity.repository.js';
import { canOwnerReadArchivedClinic, checkClinicAccess } from '../services/clinic-access.service.js';

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
    const role = (identity?.role ?? claims.role) as UserRole;
    const clinicAccess = checkClinicAccess(claims.clinicId);
    const requestPath = req.originalUrl ?? req.url ?? "";
    const isSelfDelete = req.method.toUpperCase() === "DELETE" && /^\/api\/v1\/auth\/me\/?$/.test(requestPath);
    if (clinicAccess && !isSelfDelete && !canOwnerReadArchivedClinic({ role }, req.method, requestPath)) {
      throw new ForbiddenException(clinicAccess.body);
    }
    req.auth = {
      userId: claims.sub,
      clinicId: claims.clinicId,
      role,
      accessToken: token,
    };
    return true;
  }
}
