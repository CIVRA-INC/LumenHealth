import { Schema, model, models } from "mongoose";

/**
 * Tracks which migrations have been applied to this database.
 * Write path: upsert once per migration run (idempotent).
 * Read path: checked at startup to determine pending migrations.
 */
export interface MigrationRecord {
  /** Unique migration identifier, e.g. "20240101_add_reputation_indexes" */
  name: string;
  appliedAt: Date;
  durationMs: number;
  status: "applied" | "failed";
  error?: string;
}

const migrationRecordSchema = new Schema<MigrationRecord>(
  {
    name: { type: String, required: true, unique: true, index: true },
    appliedAt: { type: Date, required: true, default: Date.now },
    durationMs: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["applied", "failed"],
      required: true,
      default: "applied",
    },
    error: { type: String },
  },
  { timestamps: false, versionKey: false },
);

export const MigrationRecordModel =
  models.MigrationRecord ||
  model<MigrationRecord>("MigrationRecord", migrationRecordSchema);
