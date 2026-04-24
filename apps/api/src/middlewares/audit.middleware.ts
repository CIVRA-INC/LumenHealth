import { RequestHandler } from "express";
import { AuditAction, AuditLogModel } from "../modules/audit/models/audit-log.model";
import { getRequestContext } from "./request-context.middleware";

const MUTATING_METHOD_TO_ACTION: Record<string, AuditAction> = {
  POST: AuditAction.CREATE,
  PUT: AuditAction.UPDATE,
  PATCH: AuditAction.UPDATE,
  DELETE: AuditAction.DELETE,
};

const getAction = (method: string): AuditAction | null => MUTATING_METHOD_TO_ACTION[method] ?? null;

const getResourceFromPath = (baseUrl: string, path: string): string => {
  const normalized = `${baseUrl}${path}`.replace(/^\/+|\/+$/g, "");
  if (!normalized) {
    return "unknown";
  }

  const parts = normalized.split("/").filter(Boolean);
  const resourceSegment = parts.find((part) => part !== "api" && part !== "v1") || "unknown";

  return resourceSegment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
};

const getResourceId = (params: Record<string, string | string[] | undefined>): string | undefined => {
  const candidate = params.id ?? params.resourceId ?? params.userId ?? params.clinicId;
  return Array.isArray(candidate) ? candidate[0] : candidate;
};

const getBodyResourceId = (body: unknown): string | undefined => {
  if (!body || typeof body !== "object") {
    return undefined;
  }

  const candidate = (body as Record<string, unknown>).encounterId
    ?? (body as Record<string, unknown>).patientId
    ?? (body as Record<string, unknown>).clinicId;

  return typeof candidate === "string" ? candidate : undefined;
};

export const auditMiddleware: RequestHandler = (req, res, next) => {
  const action = getAction(req.method);
  if (!action) {
    return next();
  }

  const context = getRequestContext(req);
  const userId = context.actor?.userId;
  const clinicId = context.clinicId;
  if (!userId || !clinicId) {
    return next();
  }

  const resource = getResourceFromPath(req.baseUrl || "", req.path || "");
  const resourceId = getResourceId(req.params) ?? getBodyResourceId(req.body);
  const ipAddress = req.ip || req.socket.remoteAddress || "unknown";
  const path = `${req.baseUrl || ""}${req.path || ""}` || req.originalUrl || "unknown";

  res.on("finish", () => {
    void AuditLogModel.create({
      clinicId,
      userId,
      action,
      resource,
      resourceId,
      method: req.method,
      path,
      statusCode: res.statusCode,
      ipAddress,
      timestamp: new Date(),
    }).catch((error: unknown) => {
      console.error("[audit] Failed to persist audit log", {
        action,
        resource,
        userId,
        error,
      });
    });
  });

  return next();
};
