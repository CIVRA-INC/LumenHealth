import type { Request } from "express";

/**
 * Request-derived metadata attached to audit entries. Populated from the
 * inbound HTTP request so audit entries actually capture who/where an action
 * came from — `AuditEntry.ipAddress`/`userAgent` were previously always
 * undefined at every call site (see issue #1026).
 */
export type RequestAuditMeta = {
  ipAddress?: string;
  userAgent?: string;
};

/** Extracts client IP and user-agent from an Express request for audit logging. */
export function auditMetaFromRequest(req: Request): RequestAuditMeta {
  return {
    ipAddress: req.ip,
    userAgent: req.header("user-agent"),
  };
}
