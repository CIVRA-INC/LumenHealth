// Issue #416 – Access Policies and Auditability: domain model and invariants
import { Types } from "mongoose";

export type PolicyEffect = "ALLOW" | "DENY";
export type PolicyStatus = "ACTIVE" | "REVOKED" | "EXPIRED";

export interface AccessPolicy {
  _id?: Types.ObjectId;
  clinicId: Types.ObjectId;       // tenancy boundary – never cross-clinic
  subjectId: Types.ObjectId;      // user the policy applies to
  resource: string;               // e.g. "encounters", "patients"
  actions: string[];              // e.g. ["read", "write"]
  effect: PolicyEffect;
  status: PolicyStatus;
  expiresAt?: Date;               // undefined = no expiry
  createdBy: Types.ObjectId;      // actor provenance
  createdAt?: Date;
  updatedAt?: Date;
}

// ── Invariants ────────────────────────────────────────────────────────────────
// 1. A policy MUST belong to exactly one clinic (clinicId required, indexed).
// 2. DENY always wins over ALLOW when multiple policies match the same subject+resource.
// 3. An EXPIRED or REVOKED policy MUST NOT grant access; status check is mandatory.
// 4. createdBy MUST reference a user in the same clinic.
// 5. actions array MUST be non-empty; empty-action policies are rejected at write time.

export type PolicyTransition = "activate" | "revoke" | "expire";

const ALLOWED_TRANSITIONS: Record<PolicyStatus, PolicyTransition[]> = {
  ACTIVE:  ["revoke", "expire"],
  REVOKED: [],
  EXPIRED: [],
};

export function canTransition(current: PolicyStatus, next: PolicyTransition): boolean {
  return ALLOWED_TRANSITIONS[current].includes(next);
}

export function isEffective(policy: AccessPolicy): boolean {
  if (policy.status !== "ACTIVE") return false;
  if (policy.expiresAt && policy.expiresAt <= new Date()) return false;
  return true;
}
