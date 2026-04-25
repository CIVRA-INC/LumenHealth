import { randomUUID } from 'crypto';
import { Request, RequestHandler } from 'express';
import { verifyAccessToken } from '../modules/auth/token.service';

const getBearerToken = (authorization: unknown): string | null => {
  if (typeof authorization !== 'string') {
    return null;
  }

  const [scheme, token] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
};

export const buildCorrelationId = (incoming: unknown) => {
  if (typeof incoming === 'string' && incoming.trim()) {
    return incoming.trim();
  }

  return randomUUID();
};

export const requestContextMiddleware: RequestHandler = (req, res, next) => {
  const correlationId = buildCorrelationId(req.headers['x-correlation-id']);
  const token = getBearerToken(req.headers.authorization);

  if (!req.user && token) {
    const decodedUser = verifyAccessToken(token);
    if (decodedUser) {
      req.user = decodedUser;
    }
  }

  req.context = {
    correlationId,
    actor: req.user
      ? {
          userId: req.user.userId,
          role: req.user.role,
        }
      : null,
    clinicId: req.user?.clinicId ?? null,
    request: {
      method: req.method,
      path: req.originalUrl || `${req.baseUrl || ''}${req.path || ''}`,
    },
    subscription: {
      status: 'unknown',
    },
  };

  res.setHeader('x-correlation-id', correlationId);
  next();
};

export const getRequestContext = (req: Request) => {
  const context = req.context;
  if (!context) {
    throw new Error('Request context not initialized');
  }

  return context;
};
