import { MigrationRecordModel } from "./models/migration-record.model";

export interface Migration {
  /** Unique, sortable name — use date prefix: "20240101_description" */
  name: string;
  up: () => Promise<void>;
}

/**
 * Runs all pending migrations in order.
 * Each migration is idempotent: skipped if already recorded as "applied".
 *
 * Usage:
 *   import { runMigrations } from "./migrations/runner";
 *   import { allMigrations } from "./migrations/index";
 *   await runMigrations(allMigrations);
 */
export async function runMigrations(migrations: Migration[]): Promise<void> {
  const sorted = [...migrations].sort((a, b) => a.name.localeCompare(b.name));

  for (const migration of sorted) {
    const existing = await MigrationRecordModel.findOne({ name: migration.name });
    if (existing?.status === "applied") {
      console.log(`[migration] skip  ${migration.name}`);
      continue;
    }

    const start = Date.now();
    try {
      await migration.up();
      await MigrationRecordModel.findOneAndUpdate(
        { name: migration.name },
        {
          name: migration.name,
          appliedAt: new Date(),
          durationMs: Date.now() - start,
          status: "applied",
          error: undefined,
        },
        { upsert: true, new: true },
      );
      console.log(`[migration] apply ${migration.name} (${Date.now() - start}ms)`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await MigrationRecordModel.findOneAndUpdate(
        { name: migration.name },
        {
          name: migration.name,
          appliedAt: new Date(),
          durationMs: Date.now() - start,
          status: "failed",
          error: message,
        },
        { upsert: true, new: true },
      );
      console.error(`[migration] fail  ${migration.name}: ${message}`);
      throw err;
    }
  }
}
