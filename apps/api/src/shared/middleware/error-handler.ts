import type { NextFunction, Request, Response } from "express";

/**
 * App-wide fallback error handler. The auth router has its own domain-specific
 * handler, but the clinic/staff/audit routers previously had none, so an
 * uncaught throw or rejected promise in those controllers fell through to
 * Express's default handler (which can leak a stack trace) — see issue #1015.
 *
 * Mounted last in app.ts so it catches anything the route-level handlers
 * didn't. Logs the real error server-side and returns a generic 500 with a
 * stable error shape consistent with the rest of the API.
 */
export function globalErrorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // If a handler already started the response, defer to Express to finish it.
  if (res.headersSent) {
    return;
  }
  console.error("[api] unhandled error:", err);
  res.status(500).json({ error: "INTERNAL_ERROR", message: "internal server error" });
}
