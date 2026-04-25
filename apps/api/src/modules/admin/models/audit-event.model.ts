import { Schema, Types, model, models } from "mongoose";

export type AuditAction =
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_DELETED"
  | "USER_ROLE_CHANGED"
  | "CLINIC_CREATED"
  | "CLINIC_UPDATED"
  | "CLINIC_DELETED"
  | "CONTENT_FLAGGED"
  | "CONTENT_REMOVED"
  | "CONTENT_APPROVED"
  | "PAYMENT_REFUNDED"
  | "SUBSCRIPTION_REVOKED"
  | "MODERATION_BAN"
  | "MODERATION_WARN"
  | "MODERATION_UNBAN"
  | "SETTINGS_CHANGED";

export type TargetType =
  | "User"
  | "Clinic"
  | "Content"
  | "Payment"
  | "Subscription"
  | "System";

/**
 * Immutable audit record. Never updated after creation.
 * Write path: append-only via AuditEventModel.create().
 * Read paths: admin dashboard (filter by actorId, targetId, action, createdAt range).
 */
export interface AuditEvent {
  /** Admin or system actor who performed the action */
  actorId: Types.ObjectId;
  actorRole: string;
  /** The entity that was acted upon */
  targetId: Types.ObjectId;
  targetType: TargetType;
  action: AuditAction;
  /** Human-readable reason or note */
  reason: string;
  /** Arbitrary snapshot of before/after state or extra context */
  metadata: Record<string, unknown>;
  /** IP address of the actor for security tracing */
  ipAddress: string;
}

const auditEventSchema = new Schema<AuditEvent>(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actorRole: {
      type: String,
      required: true,
      trim: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ["User", "Clinic", "Content", "Payment", "Subscription", "System"] as TargetType[],
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      default: "",
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    // createdAt is the canonical event timestamp; updatedAt is intentionally omitted
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

// Compound index for the most common admin query: actor + time range
auditEventSchema.index({ actorId: 1, createdAt: -1 });
// Compound index for target history
auditEventSchema.index({ targetId: 1, targetType: 1, createdAt: -1 });
// Action-level reporting
auditEventSchema.index({ action: 1, createdAt: -1 });

export const AuditEventModel =
  models.AuditEvent || model<AuditEvent>("AuditEvent", auditEventSchema);
