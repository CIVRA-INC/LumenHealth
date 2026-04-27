/**
 * Identity & Sessions – domain model and invariants (closes #406)
 *
 * Defines aggregate boundaries, state transitions, and business rules
 * that all implementation layers must respect.
 */

import { Types } from "mongoose";
import { AppRole } from "../../../types/express";

// ---------------------------------------------------------------------------
// Value objects
// ---------------------------------------------------------------------------

export type IdentityStatus = "ACTIVE" | "SUSPENDED" | "DEACTIVATED";

export type SessionStatus = "VALID" | "REVOKED" | "EXPIRED";

// ---------------------------------------------------------------------------
// Aggregates
// ---------------------------------------------------------------------------

export interface IdentityAggregate {
  id: Types.ObjectId;
  clinicId: Types.ObjectId;       // tenancy boundary – never cross clinics
  email: string;
  role: AppRole;
  status: IdentityStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionAggregate {
  id: Types.ObjectId;
  identityId: Types.ObjectId;
  clinicId: Types.ObjectId;
  status: SessionStatus;
  issuedAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
}

// ---------------------------------------------------------------------------
// State-transition invariants
// ---------------------------------------------------------------------------

/** ACTIVE → SUSPENDED | DEACTIVATED only; DEACTIVATED is terminal. */
export function assertValidIdentityTransition(
  from: IdentityStatus,
  to: IdentityStatus,
): void {
  if (from === "DEACTIVATED") {
    throw new Error(`Identity is deactivated and cannot transition to ${to}`);
  }
  if (from === to) {
    throw new Error(`Identity is already ${from}`);
  }
}

/** VALID → REVOKED | EXPIRED only; both are terminal. */
export function assertValidSessionTransition(
  from: SessionStatus,
  to: SessionStatus,
): void {
  if (from !== "VALID") {
    throw new Error(`Session is already ${from} and cannot transition to ${to}`);
  }
}

// ---------------------------------------------------------------------------
// Cross-module invariants
// ---------------------------------------------------------------------------

/** Sessions must belong to the same clinic as their identity. */
export function assertSameTenant(
  identity: Pick<IdentityAggregate, "clinicId">,
  session: Pick<SessionAggregate, "clinicId">,
): void {
  if (!identity.clinicId.equals(session.clinicId)) {
    throw new Error("Session and identity must belong to the same clinic");
  }
}
