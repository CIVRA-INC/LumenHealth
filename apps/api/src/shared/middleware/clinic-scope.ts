import type { NextFunction, Request, Response } from "express";
import { forbidden } from "./response-helpers.js";

/**
 * Verifies the resource being accessed belongs to the caller's clinic.
 *
 * Pass the name of the req.params field that holds the clinicId to check.
 * If the param is absent the middleware passes through — it only enforces
 * when the param is present and mismatched.
 *
 * Usage:
 *   router.get("/:clinicId", resolveAuthContext, requireClinicScope("clinicId"), handler)
 *
 * Why 403 here but 404 in repositories?
 *   The middleware fires before any DB lookup, so it can only see the URL param.
 *   Repositories must return 404 for cross-clinic IDs (avoids confirming existence).
 *   This middleware is an early fast-fail for obvious mismatches.
 */
export function requireClinicScope(paramName = "clinicId") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const resourceClinicId = req.params[paramName];
    if (resourceClinicId && resourceClinicId !== req.auth?.clinicId) {
      forbidden(res, "cross-clinic access denied");
      return;
    }
    next();
  };
}
