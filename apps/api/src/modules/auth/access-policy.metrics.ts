// Issue #424 – diagnostics and operational metrics for access policies and auditability

export interface PolicyMetricSnapshot {
  evaluations: number;
  allows: number;
  denies: number;
  noMatch: number;
  errors: number;
}

const counters: PolicyMetricSnapshot = {
  evaluations: 0,
  allows: 0,
  denies: 0,
  noMatch: 0,
  errors: 0,
};

export function recordEvaluation(outcome: "ALLOW" | "DENY" | "NO_MATCH"): void {
  counters.evaluations++;
  if (outcome === "ALLOW") counters.allows++;
  else if (outcome === "DENY") counters.denies++;
  else counters.noMatch++;
}

export function recordPolicyError(): void {
  counters.errors++;
}

export function getMetricSnapshot(): Readonly<PolicyMetricSnapshot> {
  return { ...counters };
}

export function resetMetrics(): void {
  counters.evaluations = 0;
  counters.allows = 0;
  counters.denies = 0;
  counters.noMatch = 0;
  counters.errors = 0;
}

// Structured log helper – never includes PHI or secrets
export function logPolicyEvent(
  logger: { info: (msg: string, ctx: Record<string, unknown>) => void },
  event: { clinicId: string; resource: string; outcome: string; policyId?: string },
): void {
  logger.info("access_policy.evaluation", {
    clinicId: event.clinicId,
    resource: event.resource,
    outcome: event.outcome,
    policyId: event.policyId ?? null,
  });
}

// Health probe – returns degraded if error rate exceeds threshold
export function healthStatus(): { status: "ok" | "degraded"; errorRate: number } {
  const total = counters.evaluations || 1;
  const errorRate = counters.errors / total;
  return { status: errorRate > 0.1 ? "degraded" : "ok", errorRate };
}
