// Issue #422 – async events and job hooks for access policies and auditability

export type AccessPolicyEventType =
  | "access_policy.created"
  | "access_policy.revoked"
  | "access_policy.expired"
  | "access_policy.evaluated";

export interface AccessPolicyEvent {
  type: AccessPolicyEventType;
  occurredAt: string;
  clinicId: string;
  subjectId: string;
  resource: string;
  policyId?: string;
  outcome?: "ALLOW" | "DENY";
  meta?: Record<string, unknown>;
}

type Handler = (event: AccessPolicyEvent) => Promise<void>;

const handlers: Map<AccessPolicyEventType, Handler[]> = new Map();

export function onAccessPolicyEvent(type: AccessPolicyEventType, handler: Handler): void {
  const existing = handlers.get(type) ?? [];
  handlers.set(type, [...existing, handler]);
}

export async function emitAccessPolicyEvent(event: AccessPolicyEvent): Promise<void> {
  const targets = handlers.get(event.type) ?? [];
  await Promise.allSettled(targets.map((h) => h(event)));
}

// Idempotency helper – downstream consumers deduplicate by this key
export function eventIdempotencyKey(event: AccessPolicyEvent): string {
  return [event.type, event.clinicId, event.subjectId, event.resource, event.occurredAt].join(":");
}

// Default audit-log sink registered at startup
export function registerAuditSink(
  writeLog: (entry: { action: string; clinicId: string; subjectId: string; meta: unknown }) => Promise<void>,
): void {
  const auditableEvents: AccessPolicyEventType[] = [
    "access_policy.created",
    "access_policy.revoked",
    "access_policy.expired",
  ];

  for (const type of auditableEvents) {
    onAccessPolicyEvent(type, async (ev) => {
      await writeLog({
        action: ev.type,
        clinicId: ev.clinicId,
        subjectId: ev.subjectId,
        meta: { resource: ev.resource, policyId: ev.policyId },
      });
    });
  }
}
