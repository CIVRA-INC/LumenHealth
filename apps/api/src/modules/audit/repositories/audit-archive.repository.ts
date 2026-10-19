import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Injectable } from "@nestjs/common";
import type { AuditEntry } from "@lumen/types";

/**
 * Cold-storage record for an archived audit entry (#1330). The full entry is
 * preserved — including `sha256Hash`, `merkleProof`, `merkleRoot`,
 * `stellarTxHash` and `anchorMode` — so archived entries remain end-to-end
 * verifiable exactly like hot ones. `archivedAt`/`policyVersion` make the
 * serving of minimum retention auditable (docs/audit-retention-policy.md).
 */
export type ArchivedAuditRecord = {
  entry: AuditEntry;
  archivedAt: string;
  policyVersion: string;
};

/** Pluggable cold-storage backend (S3, glacier, ... later). */
export interface ArchiveSink {
  write(record: ArchivedAuditRecord): void | Promise<void>;
  read(auditId: string): ArchivedAuditRecord | undefined | Promise<ArchivedAuditRecord | undefined>;
}

export class MemoryArchiveSink implements ArchiveSink {
  private readonly records = new Map<string, ArchivedAuditRecord>();

  write(record: ArchivedAuditRecord): void {
    this.records.set(record.entry.auditId, record);
  }

  read(auditId: string): ArchivedAuditRecord | undefined {
    return this.records.get(auditId);
  }
}

/** One JSON file per entry — usable on any mount designated as cold storage. */
export class JsonFileArchiveSink implements ArchiveSink {
  constructor(private readonly dir: string) {
    mkdirSync(dir, { recursive: true });
  }

  write(record: ArchivedAuditRecord): void {
    writeFileSync(
      join(this.dir, `${record.entry.auditId}.json`),
      JSON.stringify(record, null, 2)
    );
  }

  read(auditId: string): ArchivedAuditRecord | undefined {
    try {
      return JSON.parse(
        readFileSync(join(this.dir, `${auditId}.json`), "utf8")
      ) as ArchivedAuditRecord;
    } catch {
      return undefined; // absent or unreadable file = not archived here
    }
  }
}

@Injectable()
export class AuditArchiveRepository {
  private sink: ArchiveSink =
    (process.env.AUDIT_ARCHIVE_DIR
      ? new JsonFileArchiveSink(process.env.AUDIT_ARCHIVE_DIR)
      : new MemoryArchiveSink()) satisfies ArchiveSink;

  async archive(record: ArchivedAuditRecord): Promise<void> {
    await this.sink.write(record);
  }

  async find(auditId: string): Promise<ArchivedAuditRecord | undefined> {
    return await this.sink.read(auditId);
  }

  /** Swap the backend (tests, future cold-storage drivers). */
  setSink(sink: ArchiveSink): void {
    this.sink = sink;
  }
}
