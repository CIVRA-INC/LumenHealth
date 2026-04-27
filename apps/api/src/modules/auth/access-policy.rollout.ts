// Issue #425 – rollout, migration, and contribution patterns for access policies and auditability

/**
 * ROLLOUT CHECKLIST
 * -----------------
 * 1. Deploy API with ACCESS_POLICY_ENABLED=false (feature-flagged off).
 * 2. Run migration: ensure `access_policies` collection index on (clinicId, subjectId, resource, status).
 * 3. Seed default ALLOW policies for existing clinic admins via seedDefaultPolicies().
 * 4. Smoke-test evaluateAccess() against a staging clinic before enabling.
 * 5. Flip ACCESS_POLICY_ENABLED=true and monitor healthStatus() + metrics dashboard.
 * 6. Roll back by setting ACCESS_POLICY_ENABLED=false – no data is deleted.
 *
 * MIGRATION NOTES
 * ---------------
 * - Existing JWT-based role checks remain active; access policies are additive.
 * - No existing records are mutated. New collection only.
 * - Index script: db.access_policies.createIndex({ clinicId:1, subjectId:1, resource:1, status:1 })
 *
 * EXTENSION PATTERNS
 * ------------------
 * - Add new resources by extending the `resource` string enum in access-policy.domain.ts.
 * - Add new actions (e.g. "export") without schema changes – actions is a string[].
 * - Wire new async side-effects via onAccessPolicyEvent() in access-policy.events.ts.
 * - Expose new metrics by adding counters in access-policy.metrics.ts.
 */

export const ROLLOUT_MIGRATION_INDEX = `
db.access_policies.createIndex(
  { clinicId: 1, subjectId: 1, resource: 1, status: 1 },
  { name: "idx_policy_lookup", background: true }
);
`.trim();

export async function seedDefaultPolicies(
  clinicId: string,
  adminIds: string[],
  createPolicy: (p: {
    clinicId: string;
    subjectId: string;
    resource: string;
    actions: string[];
    effect: "ALLOW" | "DENY";
    actorId: string;
  }) => Promise<unknown>,
): Promise<void> {
  const defaultResources = ["patient-records", "encounters", "audit-logs"];
  const defaultActions = ["read", "write", "delete"];

  for (const adminId of adminIds) {
    for (const resource of defaultResources) {
      await createPolicy({
        clinicId,
        subjectId: adminId,
        resource,
        actions: defaultActions,
        effect: "ALLOW",
        actorId: adminId,
      }).catch(() => {
        // skip if policy already exists (idempotent seed)
      });
    }
  }
}
