/**
 * Index definitions for the `audit_entries` collection, one per hot query path.
 * Applied by the migration runner / DB bootstrap; see docs/audit-indexes.md.
 */
export type AuditIndexSpec = {
  name: string;
  key: Record<string, 1 | -1>;
  unique?: boolean;
  partialFilterExpression?: Record<string, unknown>;
  serves: string;
};

export const AUDIT_INDEXES: AuditIndexSpec[] = [
  { name: "auditId_unique", key: { auditId: 1 }, unique: true, serves: "findById, verify, anchor-result lookups" },
  { name: "clinic_createdAt", key: { clinicId: 1, createdAt: -1 }, serves: "query (default list), findAllInRange, export" },
  { name: "clinic_action_createdAt", key: { clinicId: 1, action: 1, createdAt: 1 }, serves: "query filtered by action" },
  { name: "clinic_actor_createdAt", key: { clinicId: 1, actorId: 1, createdAt: 1 }, serves: "query filtered by actor" },
  {
    name: "unanchored_createdAt",
    key: { createdAt: 1 },
    partialFilterExpression: { stellarTxHash: { $exists: false } },
    serves: "findUnanchored (stellar-service polling)",
  },
];
