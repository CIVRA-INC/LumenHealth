import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Baseline security response headers — a dependency-free equivalent of the
 * subset of `helmet` defaults that matter for a JSON API (see issue #1016).
 * Kept in-repo rather than pulling in helmet/cors to avoid adding runtime
 * dependencies and lockfile churn for a handful of static headers.
 */
export function securityHeaders(): RequestHandler {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-DNS-Prefetch-Control", "off");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
    next();
  };
}

/**
 * Explicit CORS allowlist. Only origins in `allowedOrigins` get
 * `Access-Control-Allow-Origin`; requests with no `Origin` header (server-to-
 * server, curl, same-origin) pass through untouched. Handles preflight
 * `OPTIONS` with a 204 (see issue #1016).
 */
export function corsAllowlist(allowedOrigins: string[]): RequestHandler {
  const allowed = new Set(allowedOrigins);
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.header("origin");
    if (origin && allowed.has(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type,Authorization,x-request-id,x-internal-service-token",
      );
    }

    if (req.method === "OPTIONS") {
      // Preflight: answer here rather than letting it fall through to a route.
      res.status(204).end();
      return;
    }
    next();
  };
}

/**
 * Simple in-memory, per-IP fixed-window rate limiter applied app-wide. This is
 * process-local (like the existing per-route auth buckets) — a shared store
 * would be needed for a multi-instance deployment, but this closes the "no
 * protection at all on non-auth routes" gap (see issue #1016).
 */
export function globalRateLimiter(opts: { windowMs: number; max: number }): RequestHandler {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
      next();
      return;
    }
    bucket.count += 1;
    if (bucket.count > opts.max) {
      res.status(429).json({ error: "RATE_LIMITED", message: "too many requests" });
      return;
    }
    next();
  };
}
