import type { NextFunction, Request, Response } from "express";
import type { Permission } from "@lumen/types";
import { getRolePolicy } from "../types/role-policies.js";

export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.auth?.role;
    if (!role) {
      res.status(401).json({ error: "AUTH_TOKEN_INVALID", message: "authentication required" });
      return;
    }
    const policy = getRolePolicy(role);
    if (!policy.permissions.includes(permission)) {
      res.status(403).json({ error: "AUTH_FORBIDDEN", message: "insufficient permission" });
      return;
    }
    next();
  };
}
