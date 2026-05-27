/**
 * Session Cleanup Middleware
 * Enforces session expiration and cleanup on every request
 */

import { Request, Response, NextFunction } from "express";
import { validateSession, cleanupExpiredSessions } from "../services/session";

// Run cleanup every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

/**
 * Middleware to enforce session expiration on every request
 */
export function sessionExpirationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip for non-auth routes
  if (!req.path.startsWith("/api/v1/")) {
    return next();
  }

  // Extract session ID from header or cookie
  const sessionId = req.headers["x-session-id"] as string || 
                    req.cookies?.sessionId;

  if (!sessionId) {
    return next();
  }

  // Validate session (checks expiration and inactivity)
  const session = validateSession(sessionId);

  if (!session) {
    res.status(401).json({
      error: "Session expired or invalid",
      code: "SESSION_EXPIRED",
    });
    return;
  }

  // Attach session to request for downstream use
  (req as any).session = session;

  // Run periodic cleanup
  maybeRunCleanup();

  next();
}

/**
 * Run session cleanup if enough time has passed
 */
function maybeRunCleanup(): void {
  const now = Date.now();
  if (now - lastCleanup > CLEANUP_INTERVAL) {
    const cleaned = cleanupExpiredSessions();
    if (cleaned > 0) {
      console.log(`Session cleanup: removed ${cleaned} expired sessions`);
    }
    lastCleanup = now;
  }
}

/**
 * Middleware to require authentication
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const session = (req as any).session;

  if (!session) {
    res.status(401).json({
      error: "Authentication required",
      code: "NOT_AUTHENTICATED",
    });
    return;
  }

  next();
}

/**
 * Middleware to require specific roles
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const session = (req as any).session;

    if (!session) {
      res.status(401).json({
        error: "Authentication required",
        code: "NOT_AUTHENTICATED",
      });
      return;
    }

    if (!roles.includes(session.role)) {
      res.status(403).json({
        error: "Insufficient permissions",
        code: "FORBIDDEN",
        requiredRoles: roles,
        currentRole: session.role,
      });
      return;
    }

    next();
  };
}
