// Issue #418 – Access Policies and Auditability: service orchestration
import { Types } from "mongoose";
import { AccessPolicyModel } from "./models/access-policy.model";
import { canTransition, isEffective, PolicyStatus, PolicyTransition } from "./access-policy.domain";
import type { AccessPolicy } from "./access-policy.domain";

function err(msg: string, status: number, code: string): never {
  throw Object.assign(new Error(msg), { status, code });
}

export async function createPolicy(payload: {
  clinicId: string;
  subjectId: string;
  resource: string;
  actions: string[];
  effect: "ALLOW" | "DENY";
  expiresAt?: Date;
  actorId: string;
}): Promise<AccessPolicy> {
  const conflict = await AccessPolicyModel.findOne({
    clinicId: new Types.ObjectId(payload.clinicId),
    subjectId: new Types.ObjectId(payload.subjectId),
    resource: payload.resource,
    effect: payload.effect,
    status: "ACTIVE",
  }).lean();
  if (conflict) err("Active policy already exists for this subject+resource+effect", 409, "POLICY_CONFLICT");

  return AccessPolicyModel.create({
    clinicId:  new Types.ObjectId(payload.clinicId),
    subjectId: new Types.ObjectId(payload.subjectId),
    resource:  payload.resource,
    actions:   payload.actions,
    effect:    payload.effect,
    status:    "ACTIVE",
    expiresAt: payload.expiresAt,
    createdBy: new Types.ObjectId(payload.actorId),
  });
}

export async function listPolicies(clinicId: string, subjectId?: string) {
  const filter: Record<string, unknown> = { clinicId: new Types.ObjectId(clinicId), status: "ACTIVE" };
  if (subjectId) filter.subjectId = new Types.ObjectId(subjectId);
  return AccessPolicyModel.find(filter).sort({ createdAt: -1 }).lean();
}

export async function transitionPolicy(id: string, clinicId: string, transition: PolicyTransition) {
  const policy = await AccessPolicyModel.findOne({ _id: id, clinicId: new Types.ObjectId(clinicId) });
  if (!policy) err("Policy not found", 404, "NOT_FOUND");
  if (!canTransition(policy.status as PolicyStatus, transition)) {
    err(`Cannot apply '${transition}' to a ${policy.status} policy`, 422, "INVALID_TRANSITION");
  }
  const nextStatus: PolicyStatus = transition === "revoke" ? "REVOKED" : "EXPIRED";
  policy.status = nextStatus;
  return policy.save();
}

export async function evaluateAccess(clinicId: string, subjectId: string, resource: string, action: string) {
  const policies = await AccessPolicyModel.find({
    clinicId:  new Types.ObjectId(clinicId),
    subjectId: new Types.ObjectId(subjectId),
    resource,
    status: "ACTIVE",
  }).lean();

  const effective = policies.filter(isEffective);
  // DENY wins over ALLOW
  const denied = effective.some((p) => p.effect === "DENY" && p.actions.includes(action));
  if (denied) return { allowed: false, reason: "DENY policy matched" };
  const allowed = effective.some((p) => p.effect === "ALLOW" && p.actions.includes(action));
  return { allowed, reason: allowed ? "ALLOW policy matched" : "No matching policy" };
}
