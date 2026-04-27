// Issue #420 – Access Policies and Auditability: RBAC, audit logging, and tenancy checks
import { RequestHandler } from "express";
import { forbiddenProblem, unauthorizedProblem } from "../../core/problem";
import { AuditLogModel } from "../audit/models/audit-log.model";
import { evaluateAccess } from "./access-policy.service";

/**
 * Middleware factory that enforces a fine-grained access policy for a given
 * resource + action pair, then emits an audit event for every decision.
 *
 * Usage:
 *   router.get("/encounters", policyGuard("encounters", "read"), handler);
 */
export function policyGuard(resource: string, action: string): RequestHandler {
  return async (req, res, next) => {
    const { clinicId, userId } = req.user ?? {};

    if (!clinicId || !userId) return next(unauthorizedProblem());

    // Tenancy check: req.user.clinicId must match any resource-level clinicId param
    const paramClinic = req.params.clinicId ?? req.query.clinicId;
    if (paramClinic && paramClinic !== clinicId) {
      await emitAuditEvent({ clinicId, userId, resource, action, allowed: false, ip: req.ip ?? "" });
      return next(forbiddenProblem());
    }

    const { allowed, reason } = await evaluateAccess(clinicId, userId, resource, action);

    await emitAuditEvent({ clinicId, userId, resource, action, allowed, ip: req.ip ?? "" });

    if (!allowed) return next(forbiddenProblem());

    return next();
  };
}

async function emitAuditEvent(opts: {
  clinicId: string;
  userId: string;
  resource: string;
  action: string;
  allowed: boolean;
  ip: string;
}) {
  try {
    await AuditLogModel.create({
      clinicId:   opts.clinicId,
      userId:     opts.userId,
      action:     opts.allowed ? `${opts.resource}.${opts.action}.allowed` : `${opts.resource}.${opts.action}.denied`,
      resource:   opts.resource,
      ipAddress:  opts.ip,
      timestamp:  new Date(),
    });
  } catch {
    // Audit failures must never block the request path
  }
}
