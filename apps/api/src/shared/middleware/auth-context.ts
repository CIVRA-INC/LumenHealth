import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@lumen/types';
import { accessTokenSigner } from '../../modules/auth/services/token.service.js';
import { identityStore } from '../../modules/auth/repositories/identity.repository.js';
import { unauthorized } from './response-helpers.js';

export type AuthContext = {
  userId: string;
  clinicId: string;
  role: UserRole;
  accessToken: string;
};

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthContext;
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
  const role = (identity?.role ?? claims.role) as UserRole;

  // `system` is reserved for automated/internal actors (e.g. the anchoring job
  // recording audit events) and is never a real, authenticatable user role. Even
  // if a token ever claimed it, reject it here so it can't reach any handler as a
  // real request (see issue #1029).
  if (role === 'system') return unauthorized(res, 'system role is not permitted for user requests');

  req.auth = {
    userId: claims.sub,
    clinicId: claims.clinicId,
    role,
    accessToken: token,
  };
  next();
}
