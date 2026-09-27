import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@lumen/types';
import { accessTokenSigner } from '../../modules/auth/services/token.service.js';
import { identityStore } from '../../modules/auth/repositories/identity.repository.js';
import { unauthorized } from './response-helpers.js';
import type { AuthContextType } from '../types/auth-context.js';

export type { AuthContextType };

/** @deprecated Use `AuthContextType` from `shared/types/auth-context.js`. */
export type AuthContext = AuthContextType;

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthContextType;
  }
}

export function resolveAuthContext(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer '))
    return unauthorized(res, 'missing bearer token');
  const token = auth.slice('Bearer '.length);
  const claims = accessTokenSigner.verify(token);
  if (!claims) return unauthorized(res, 'expired or invalid token');

  if (!claims.clinicId) return unauthorized(res, 'token missing clinic scope');
  const identity = identityStore.findById(claims.sub);
  req.auth = {
    userId: claims.sub,
    clinicId: claims.clinicId,
    role: (identity?.role ?? claims.role) as UserRole,
    accessToken: token,
  };
  next();
}
