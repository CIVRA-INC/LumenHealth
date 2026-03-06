import { model, Schema } from "mongoose";

export enum AuditAction {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
}

export interface AuditLogDocument {
  userId: string;
  clinicId?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  timestamp: Date;
  ipAddress: string;
}

const auditLogSchema = new Schema<AuditLogDocument>(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
    },
    clinicId: {
      type: String,
      required: false,
      trim: true,
    },
    action: {
      type: String,
      enum: Object.values(AuditAction),
      required: true,
    },
    resource: {
      type: String,
      required: true,
      trim: true,
    },
    resourceId: {
      type: String,
      required: false,
      trim: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    ipAddress: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    versionKey: false,
  },
);

auditLogSchema.index({ clinicId: 1, timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

export const AuditLogModel = model<AuditLogDocument>("AuditLog", auditLogSchema);
