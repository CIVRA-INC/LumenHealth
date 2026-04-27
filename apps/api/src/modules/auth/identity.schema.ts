/**
 * Identity & Sessions – persistence schema and indexes (closes #407)
 *
 * Translates the domain model into MongoDB documents with tenancy-safe
 * indexes and audit metadata.
 */

import { Schema, Types, model, models } from "mongoose";
import { AppRole } from "../../../types/express";
import { IdentityStatus, SessionStatus } from "./identity.domain";

// ---------------------------------------------------------------------------
// Identity document
// ---------------------------------------------------------------------------

export interface IdentityDoc {
  clinicId: Types.ObjectId;
  email: string;
  role: AppRole;
  status: IdentityStatus;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
}

const identitySchema = new Schema<IdentityDoc>(
  {
    clinicId:  { type: Schema.Types.ObjectId, ref: "Clinic", required: true, index: true },
    email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    role:      { type: String, required: true },
    status:    { type: String, enum: ["ACTIVE", "SUSPENDED", "DEACTIVATED"], default: "ACTIVE" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, versionKey: false },
);

// Compound index: list active identities per clinic efficiently
identitySchema.index({ clinicId: 1, status: 1 });

export const IdentityModel =
  models.Identity || model<IdentityDoc>("Identity", identitySchema);

// ---------------------------------------------------------------------------
// Session document
// ---------------------------------------------------------------------------

export interface SessionDoc {
  identityId: Types.ObjectId;
  clinicId: Types.ObjectId;
  status: SessionStatus;
  issuedAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
}

const sessionSchema = new Schema<SessionDoc>(
  {
    identityId: { type: Schema.Types.ObjectId, ref: "Identity", required: true, index: true },
    clinicId:   { type: Schema.Types.ObjectId, ref: "Clinic",   required: true, index: true },
    status:     { type: String, enum: ["VALID", "REVOKED", "EXPIRED"], default: "VALID" },
    issuedAt:   { type: Date, required: true, default: Date.now },
    expiresAt:  { type: Date, required: true, index: true },
    revokedAt:  { type: Date },
  },
  { timestamps: false, versionKey: false },
);

// TTL index: MongoDB auto-removes expired sessions after 1 hour grace period
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });
// Lookup valid sessions for an identity quickly
sessionSchema.index({ identityId: 1, status: 1 });

export const SessionModel =
  models.Session || model<SessionDoc>("Session", sessionSchema);
