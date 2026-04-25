import { Types } from "mongoose";
import { SupporterReputationModel } from "../reputation/models/supporter-reputation.model";
import { AuditEventModel } from "../admin/models/audit-event.model";

/**
 * Seeds a minimal SupporterReputation document for a given userId.
 * Idempotent — skips if the document already exists.
 */
export async function seedSupporterReputation(userId: Types.ObjectId): Promise<void> {
  const exists = await SupporterReputationModel.findOne({ userId });
  if (exists) return;

  await SupporterReputationModel.create({
    userId,
    artistPoints: {},
    totalPoints: 0,
    level: 1,
    badges: [],
    streaks: [],
  });
}

/**
 * Seeds a system-level audit event to mark a migration or seed run.
 * Useful for traceability in production.
 */
export async function seedAuditEvent(
  actorId: Types.ObjectId,
  description: string,
): Promise<void> {
  await AuditEventModel.create({
    actorId,
    actorRole: "SYSTEM",
    targetId: actorId,
    targetType: "System",
    action: "SETTINGS_CHANGED",
    reason: description,
    metadata: { seededAt: new Date().toISOString() },
    ipAddress: "127.0.0.1",
  });
}
