/**
 * Identity & Sessions – service orchestration (closes #408)
 *
 * Concentrates business rules, conflict checks, and cross-model writes.
 * Controllers must stay thin and delegate all logic here.
 */

import { Types } from "mongoose";
import { AppRole } from "../../../types/express";
import {
  assertValidIdentityTransition,
  assertValidSessionTransition,
  IdentityStatus,
} from "./identity.domain";
import { IdentityModel, SessionModel } from "./identity.schema";

// ---------------------------------------------------------------------------
// Identity operations
// ---------------------------------------------------------------------------

export async function createIdentity(payload: {
  clinicId: string;
  email: string;
  role: AppRole;
  actorId: string;
}) {
  const existing = await IdentityModel.findOne({ email: payload.email });
  if (existing) {
    throw Object.assign(new Error("Email already registered"), { status: 409, code: "EMAIL_CONFLICT" });
  }

  return IdentityModel.create({
    clinicId:  new Types.ObjectId(payload.clinicId),
    email:     payload.email,
    role:      payload.role,
    status:    "ACTIVE",
    createdBy: new Types.ObjectId(payload.actorId),
    updatedBy: new Types.ObjectId(payload.actorId),
  });
}

export async function transitionIdentityStatus(
  identityId: string,
  to: IdentityStatus,
  actorId: string,
) {
  const identity = await IdentityModel.findById(identityId);
  if (!identity) {
    throw Object.assign(new Error("Identity not found"), { status: 404, code: "NOT_FOUND" });
  }

  assertValidIdentityTransition(identity.status, to);

  identity.status    = to;
  identity.updatedBy = new Types.ObjectId(actorId);
  return identity.save();
}

// ---------------------------------------------------------------------------
// Session operations
// ---------------------------------------------------------------------------

export async function openSession(identityId: string, clinicId: string, ttlSeconds = 900) {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  return SessionModel.create({
    identityId: new Types.ObjectId(identityId),
    clinicId:   new Types.ObjectId(clinicId),
    status:     "VALID",
    issuedAt:   new Date(),
    expiresAt,
  });
}

export async function revokeSession(sessionId: string) {
  const session = await SessionModel.findById(sessionId);
  if (!session) {
    throw Object.assign(new Error("Session not found"), { status: 404, code: "NOT_FOUND" });
  }

  assertValidSessionTransition(session.status, "REVOKED");

  session.status    = "REVOKED";
  session.revokedAt = new Date();
  return session.save();
}

export async function listActiveSessions(identityId: string) {
  return SessionModel.find({ identityId: new Types.ObjectId(identityId), status: "VALID" }).lean();
}
