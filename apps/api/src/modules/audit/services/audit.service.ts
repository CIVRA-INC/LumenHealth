import { randomUUID } from "crypto";
import type { AuditAction, AuditEntry, AuditQuery, UserRole } from "@lumen/types";
import { auditStore } from "../repositories/audit.repository.js";

export type RecordAuditParams = {
  clinicId: string;
  action: AuditAction;
  actorId: string;
  actorRole: UserRole;
  targetId?: string;
  targetType?: "staff" | "clinic" | "invitation";
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
};

export function recordAudit(params: RecordAuditParams): AuditEntry {
  const entry: AuditEntry = {
    auditId: randomUUID(),
    clinicId: params.clinicId,
    action: params.action,
    actorId: params.actorId,
    actorRole: params.actorRole,
    targetId: params.targetId,
    targetType: params.targetType,
    before: params.before,
    after: params.after,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    createdAt: new Date().toISOString(),
  };

  return auditStore.save(entry);
}

export function queryAuditLog(q: AuditQuery): { entries: AuditEntry[]; total: number } {
  return auditStore.query(q);
}
