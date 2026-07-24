import { randomUUID } from "crypto";
import {
  hashAuditEntry,
  type AuditAction,
  type AuditEntry,
  type AuditQuery,
  type BatchAnchorResult,
  type UserRole,
} from "@lumen/types";
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
  const unhashed = {
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
  const entry: AuditEntry = {
    ...unhashed,
    sha256Hash: hashAuditEntry(unhashed),
  };

  return auditStore.save(entry);
}

export function queryAuditLog(q: AuditQuery): { entries: AuditEntry[]; total: number } {
  return auditStore.query(q);
}

/** Minimal shape the anchoring job needs: just enough to build a Merkle tree. */
export function getUnanchoredEntries(): { auditId: string; sha256Hash: string }[] {
  return auditStore.findUnanchored().map((entry) => ({
    auditId: entry.auditId,
    sha256Hash: entry.sha256Hash,
  }));
}

/**
 * Applies a completed Stellar batch anchor result to the entries it covers,
 * then records one `batch.anchored` audit entry per affected clinic.
 */
export function applyBatchAnchorResult(result: BatchAnchorResult): AuditEntry[] {
  const updated = auditStore.applyAnchorResult(result);

  const clinicIds = [...new Set(updated.map((entry) => entry.clinicId))];
  for (const clinicId of clinicIds) {
    const entryCount = updated.filter((entry) => entry.clinicId === clinicId).length;
    recordAudit({
      clinicId,
      action: "batch.anchored",
      actorId: "stellar-service",
      actorRole: "system",
      after: {
        merkleRoot: result.merkleRoot,
        stellarTxHash: result.stellarTxHash,
        anchoredAt: result.anchoredAt,
        entryCount,
      },
    });
  }

  return updated;
}
