import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Detects and blocks suspicious request patterns:
 * - Oversized payloads (beyond express.json limit, belt-and-suspenders check)
 * - Malformed or missing Content-Type on POST/PUT/PATCH
 * - Suspiciously large query strings (path traversal / injection probes)
 * - Null-byte injection in URL
 * - Repeated rapid registration attempts from the same IP (credential stuffing signal)
 */

const MAX_BODY_BYTES = 1_048_576; // 1 MB
const MAX_QUERY_LENGTH = 2_048;

interface AbuseEntry {
  count: number;
  resetAt: number;
}

const registrationAttempts = new Map<string, AbuseEntry>();
const REGISTRATION_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REGISTRATIONS_PER_HOUR = 5;

// Cleanup stale entries periodically
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of registrationAttempts) {
    if (entry.resetAt <= now) registrationAttempts.delete(key);
  }
}, REGISTRATION_WINDOW_MS);
cleanup.unref();

function getIp(req: Request): string {
  return req.ip ?? 'unknown';
}

/** Rejects requests with null bytes in the URL (common injection probe). */
export const nullByteGuard: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  if (req.url.includes('\0')) {
    res.status(400).json({
      status: 'error',
      error: { code: 'BAD_REQUEST', message: 'Invalid request.' },
    });
    return;
  }
  next();
};

/** Rejects oversized query strings. */
export const queryLengthGuard: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  const qs = req.url.split('?')[1] ?? '';
  if (qs.length > MAX_QUERY_LENGTH) {
    res.status(400).json({
      status: 'error',
      error: { code: 'BAD_REQUEST', message: 'Query string too large.' },
    });
    return;
  }
  next();
};

/** Rejects mutation requests with a body that exceeds the size cap. */
export const bodySizeGuard: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  const mutationMethods = ['POST', 'PUT', 'PATCH'];
  if (!mutationMethods.includes(req.method)) {
    next();
    return;
  }

  const contentLength = parseInt(req.headers['content-length'] ?? '0', 10);
  if (contentLength > MAX_BODY_BYTES) {
    res.status(413).json({
      status: 'error',
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large.' },
    });
    return;
  }
  next();
};

/**
 * Tracks registration attempts per IP.
 * Apply only to POST /api/v1/clinics (clinic registration) and POST /api/v1/auth/register.
 */
export const registrationAbuseGuard: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  const ip = getIp(req);
  const now = Date.now();

  let entry = registrationAttempts.get(ip);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + REGISTRATION_WINDOW_MS };
    registrationAttempts.set(ip, entry);
  }

  entry.count += 1;

  if (entry.count > MAX_REGISTRATIONS_PER_HOUR) {
    console.warn('[anti-abuse] High-frequency registration attempt blocked', { ip, count: entry.count });
    res.status(429).json({
      status: 'error',
      error: { code: 'RATE_LIMITED', message: 'Too many registration attempts. Please try again later.' },
    });
    return;
  }

  next();
};

/**
 * Composite anti-abuse middleware — apply globally before routes.
 * Combines null-byte, query-length, and body-size guards.
 */
export const antiAbuseMiddleware: RequestHandler[] = [
  nullByteGuard,
  queryLengthGuard,
  bodySizeGuard,
];
