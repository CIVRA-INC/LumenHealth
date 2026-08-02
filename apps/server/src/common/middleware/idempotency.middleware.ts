import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
  // A real implementation would use Redis.
  // This is a stub for the initial setup.
  private cache = new Map<string, any>();

  use(req: Request, res: Response, next: NextFunction) {
    if (
      req.method !== 'POST' &&
      req.method !== 'PATCH' &&
      req.method !== 'PUT'
    ) {
      return next();
    }

    const idempotencyKey = req.headers['idempotency-key'] as string;
    if (!idempotencyKey) {
      return next();
    }

    if (this.cache.has(idempotencyKey)) {
      const cachedResponse = this.cache.get(idempotencyKey);
      return res.status(cachedResponse.statusCode).json(cachedResponse.body);
    }

    // Intercept response to cache it
    const originalSend = res.send.bind(res);
    res.send = (body: any) => {
      this.cache.set(idempotencyKey, {
        statusCode: res.statusCode,
        body: JSON.parse(body), // Assuming JSON
      });
      return originalSend(body);
    };

    next();
  }
}
