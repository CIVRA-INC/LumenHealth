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
    clinicId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    action: {
      type: String,
      enum: Object.values(AuditAction),
      required: true,
      index: true,
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
      index: true,
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
auditLogSchema.index({ clinicId: 1, action: 1, timestamp: -1 });
auditLogSchema.index({ clinicId: 1, userId: 1, timestamp: -1 });

export const AuditLogModel = model<AuditLogDocument>("AuditLog", auditLogSchema);
