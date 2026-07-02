import type { Request, Response } from "express";
import type { AuditAction } from "@lumen/types";
import { queryAuditLog } from "../services/audit.service.js";

export function list(req: Request, res: Response): void {
  const role = req.auth!.role;
  if (role !== "owner" && role !== "admin") {
    res.status(403).json({ error: "AUTH_FORBIDDEN", message: "only owner or admin can view audit logs" });
    return;
  }

  const clinicId = req.auth!.clinicId;
  const { action, actorId, targetId, from, to, page, limit } = req.query;

  const result = queryAuditLog({
    clinicId,
    action: action as AuditAction | undefined,
    actorId: actorId as string | undefined,
    targetId: targetId as string | undefined,
    from: from as string | undefined,
    to: to as string | undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });

  res.json(result);
}
