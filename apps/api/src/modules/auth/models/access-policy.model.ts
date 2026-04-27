// Issue #417 – Access Policies and Auditability: persistence schema and indexes
import { Schema, Types, model, models } from "mongoose";
import type { AccessPolicy } from "../access-policy.domain";

const accessPolicySchema = new Schema<AccessPolicy>(
  {
    clinicId: { type: Schema.Types.ObjectId, ref: "Clinic", required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    resource: { type: String, required: true, trim: true },
    actions: {
      type: [String],
      required: true,
      validate: { validator: (v: string[]) => v.length > 0, message: "actions must not be empty" },
    },
    effect: { type: String, enum: ["ALLOW", "DENY"], required: true },
    status: { type: String, enum: ["ACTIVE", "REVOKED", "EXPIRED"], required: true, default: "ACTIVE" },
    expiresAt: { type: Date, required: false, default: undefined, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, versionKey: false },
);

// Primary lookup: all active policies for a subject within a clinic
accessPolicySchema.index({ clinicId: 1, subjectId: 1, status: 1 });

// Resource-scoped enforcement: find policies by clinic + resource + status
accessPolicySchema.index({ clinicId: 1, resource: 1, status: 1 });

// TTL-style expiry sweep (background job can query expiresAt < now, status = ACTIVE)
accessPolicySchema.index({ expiresAt: 1, status: 1 });

// Audit trail: who created policies in a clinic, ordered by creation time
accessPolicySchema.index({ clinicId: 1, createdBy: 1, createdAt: -1 });

export const AccessPolicyModel =
  models.AccessPolicy || model<AccessPolicy>("AccessPolicy", accessPolicySchema);
