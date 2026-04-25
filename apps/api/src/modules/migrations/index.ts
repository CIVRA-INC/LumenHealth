import { Migration } from "./runner";
import { SupporterReputationModel } from "../reputation/models/supporter-reputation.model";
import { AuditEventModel } from "../admin/models/audit-event.model";

/**
 * All migrations in this array are run in lexicographic order by name.
 * Add new migrations here; never remove or rename existing entries.
 */
export const allMigrations: Migration[] = [
  {
    name: "20260425_001_create_reputation_indexes",
    async up() {
      // Ensure compound index for leaderboard queries: level desc, totalPoints desc
      await SupporterReputationModel.collection.createIndex(
        { level: -1, totalPoints: -1 },
        { background: true },
      );
    },
  },
  {
    name: "20260425_002_create_audit_event_indexes",
    async up() {
      // Compound index for actor + time range (most common admin query)
      await AuditEventModel.collection.createIndex(
        { actorId: 1, createdAt: -1 },
        { background: true },
      );
      // Compound index for target history
      await AuditEventModel.collection.createIndex(
        { targetId: 1, targetType: 1, createdAt: -1 },
        { background: true },
      );
    },
  },
];
