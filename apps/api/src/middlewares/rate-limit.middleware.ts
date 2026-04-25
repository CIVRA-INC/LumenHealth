import { Request, Response, NextFunction, RequestHandler } from 'express';

interface RateLimitOptions {
  /** Window size in milliseconds */
  windowMs: number;
  /** Max requests per window per key */
  max: number;
  /** Derive the key from the request (defaults to IP) */
  keyFn?: (req: Request) => string;
  /** Message sent when limit is exceeded */
  message?: string;
}

interface WindowEntry {
  count: number;
  resetAt: number;
}

/**
 * Minimal in-memory rate limiter.
 * Each instance maintains its own counter store — suitable for single-process deployments.
 */
export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  const { windowMs, max, message = 'Too many requests, please try again later.' } = options;
  const keyFn = options.keyFn ?? ((req) => req.ip ?? 'unknown');

  const store = new Map<string, WindowEntry>();

  // Periodic cleanup to prevent unbounded memory growth
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
  }, windowMs);
  cleanup.unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyFn(req);
    const now = Date.now();

    let entry = store.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    entry.count += 1;

    const remaining = Math.max(0, max - entry.count);
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

    if (entry.count > max) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      res.status(429).json({
        status: 'error',
        error: { code: 'RATE_LIMITED', message },
      });
      return;
    }

    next();
  };
}

/** Strict limiter for auth endpoints (login, register, password reset) */
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
});

/** Moderate limiter for state-mutating routes (POST/PUT/PATCH/DELETE) */
export const mutationRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: 'Too many requests. Please slow down.',
});
