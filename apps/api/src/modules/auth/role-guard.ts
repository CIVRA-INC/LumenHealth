import type { NextFunction, Request, Response } from "express";
import { getRolePolicy } from "./policy-catalog.js";
import type { Permission, UserRole } from "@lumen/types";

export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = (req.headers["x-role"] as UserRole | undefined) ?? "clinician";
    const policy = getRolePolicy(role);
    if (!policy.permissions.includes(permission)) {
      res.status(403).json({ error: "AUTH_FORBIDDEN", message: "insufficient permission" });
      return;
    }
    next();
  };
}
