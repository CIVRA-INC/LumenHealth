import { randomUUID } from "node:crypto";
import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import type { AuditEntry } from "@lumen/types";
import { AuditRepository } from "../repositories/audit.repository.js";
import {
  AuditArchiveRepository,
  type ArchivedAuditRecord,
} from "../repositories/audit-archive.repository.js";

/**
 * Retention, legal-hold and archival enforcement (#1330).
 * Normative policy: docs/audit-retention-policy.md — the constants below
 * must match that document (policy v1.0).
 */

export const RETENTION_POLICY_VERSION = "1.0";
/** Minimum retention floor for audit data — nothing is deleted before this. */
export const MIN_RETENTION_YEARS = 7;
/** Anchored entries older than this move from the hot store to the archive. */
export const HOT_TIER_DAYS = 90;

const MS_PER_DAY = 86_400_000;
const DEFAULT_RETENTION_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 h

export type LegalHold = {
  holdId: string;
  /** Clinic scope; `"*"` holds every clinic. */
  clinicId: string;
  reason: string;
  placedBy: string;
  placedAt: string;
  releasedAt?: string;
};

export type RetentionCycleReport = {
  ranAt: string;
  archived: number;
  skippedUnderHold: number;
  skippedUnanchored: number;
  skippedTooRecent: number;
  hotEntriesRemaining: number;
};

export type DeleteVerdict = { allowed: true } | { allowed: false; reason: string };

@Injectable()
export class RetentionService implements OnModuleInit, OnModuleDestroy {
  private readonly holds = new Map<string, LegalHold>();
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(
    private readonly auditRepository: AuditRepository,
    private readonly archiveRepository: AuditArchiveRepository
  ) {}

  onModuleInit(): void {
    const raw = process.env.AUDIT_RETENTION_INTERVAL_MS;
    const intervalMs = raw === undefined ? DEFAULT_RETENTION_INTERVAL_MS : Number(raw);
    if (Number.isFinite(intervalMs) && intervalMs > 0) {
      this.timer = setInterval(() => {
        void this.runRetentionCycle().catch(() => undefined);
      }, intervalMs);
    }
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  // ── Legal hold ──────────────────────────────────────────────────────────

  placeHold(params: { clinicId: string; reason: string; placedBy: string; now?: Date }): LegalHold {
    const hold: LegalHold = {
      holdId: randomUUID(),
      clinicId: params.clinicId,
      reason: params.reason,
      placedBy: params.placedBy,
      placedAt: (params.now ?? new Date()).toISOString(),
    };
    this.holds.set(hold.holdId, hold);
    return hold;
  }

  releaseHold(holdId: string, now: Date = new Date()): LegalHold | null {
    const hold = this.holds.get(holdId);
    if (!hold || hold.releasedAt) return null;
    hold.releasedAt = now.toISOString();
    return hold;
  }

  isUnderHold(clinicId: string): boolean {
    for (const hold of this.holds.values()) {
      if (hold.releasedAt) continue;
      if (hold.clinicId === "*" || hold.clinicId === clinicId) return true;
    }
    return false;
  }

  // ── Retention cycle ─────────────────────────────────────────────────────

  async runRetentionCycle(now: Date = new Date()): Promise<RetentionCycleReport> {
    const cutoff = now.getTime() - HOT_TIER_DAYS * MS_PER_DAY;
    let archived = 0;
    let skippedUnderHold = 0;
    let skippedUnanchored = 0;
    let skippedTooRecent = 0;

    for (const entry of this.auditRepository.findAll()) {
      if (!entry.stellarTxHash) {
        skippedUnanchored += 1; // archival must not shed un-anchored work
        continue;
      }
      if (Date.parse(entry.createdAt) > cutoff) {
        skippedTooRecent += 1;
        continue;
      }
      if (this.isUnderHold(entry.clinicId)) {
        skippedUnderHold += 1;
        continue;
      }
      await this.archiveRepository.archive({
        entry,
        archivedAt: now.toISOString(),
        policyVersion: RETENTION_POLICY_VERSION,
      });
      this.auditRepository.delete(entry.auditId);
      archived += 1;
    }

    return {
      ranAt: now.toISOString(),
      archived,
      skippedUnderHold,
      skippedUnanchored,
      skippedTooRecent,
      hotEntriesRemaining: this.auditRepository.findAll().length,
    };
  }

  // ── Deletion gate (single predicate any future deletion path consults) ──

  canDelete(record: ArchivedAuditRecord, now: Date = new Date()): DeleteVerdict {
    if (this.isUnderHold(record.entry.clinicId)) {
      return { allowed: false, reason: "clinic is under legal hold" };
    }
    const createdAtMs = Date.parse(record.entry.createdAt);
    const earliestDeletion = createdAtMs + MIN_RETENTION_YEARS * 365 * MS_PER_DAY;
    if (now.getTime() < earliestDeletion) {
      return {
        allowed: false,
        reason: `minimum retention of ${MIN_RETENTION_YEARS} years has not been served`,
      };
    }
    return { allowed: true };
  }

  // ── Archive-aware lookup (verification must work on archived entries) ───

  /** Hot store first, then the cold archive. */
  async findEntryIncludingArchive(auditId: string): Promise<AuditEntry | undefined> {
    const hot = this.auditRepository.findById(auditId);
    if (hot) return hot;
    return (await this.archiveRepository.find(auditId))?.entry;
  }
}
