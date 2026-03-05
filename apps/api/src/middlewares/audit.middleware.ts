import { RequestHandler } from "express";
import { AuditAction, AuditLogModel } from "../modules/audit/models/audit-log.model";
import { verifyAccessToken } from "../modules/auth/token.service";

const MUTATING_METHOD_TO_ACTION: Record<string, AuditAction> = {
  POST: AuditAction.CREATE,
  PUT: AuditAction.UPDATE,
  PATCH: AuditAction.UPDATE,
  DELETE: AuditAction.DELETE,
};

const getAction = (method: string): AuditAction | null => {
  return MUTATING_METHOD_TO_ACTION[method] ?? null;
};

const getResourceFromPath = (baseUrl: string): string => {
  const normalized = baseUrl.replace(/^\/+|\/+$/g, "");
  if (!normalized) {
    return "Unknown";
  }

  const parts = normalized.split("/");
  const resourceSegment = parts[parts.length - 1] || "Unknown";

  return resourceSegment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
};

const getResourceId = (
  params: Record<string, string | string[] | undefined>,
): string | undefined => {
  const candidate = params.id ?? params.resourceId ?? params.userId ?? params.clinicId;
  if (Array.isArray(candidate)) {
    return candidate[0];
  }

  return candidate;
};

const getTokenFromAuthorizationHeader = (authorization: unknown): string | null => {
  if (typeof authorization !== "string") {
    return null;
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
};

export const auditMiddleware: RequestHandler = (req, res, next) => {
  const action = getAction(req.method);
  if (!action) {
    return next();
  }

  const token = getTokenFromAuthorizationHeader(req.headers.authorization);
  if (!req.user && token) {
    const decodedUser = verifyAccessToken(token);
    if (decodedUser) {
      req.user = decodedUser;
    }
  }

  const userId = req.user?.userId;
  if (!userId) {
    return next();
  }

  const clinicId = req.user?.clinicId;
  const resource = getResourceFromPath(req.baseUrl || req.path);
  const resourceId = getResourceId(req.params);
  const ipAddress = req.ip || req.socket.remoteAddress || "unknown";

  res.on("finish", () => {
    void AuditLogModel.create({
      userId,
      clinicId,
      action,
      resource,
      resourceId,
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
