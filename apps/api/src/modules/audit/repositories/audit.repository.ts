import { Injectable } from '@nestjs/common';
import { paginateByCursor, type CursorPage } from '../../../shared/pagination/cursor.js';
import type { AuditEntry, AuditQuery, BatchAnchorResult } from "@lumen/types";

export class AuditImmutableError extends Error {
  constructor(auditId: string) {
    super(`audit entry ${auditId} is append-only and cannot be modified`);
    this.name = "AuditImmutableError";
  }
}

@Injectable()
export class AuditRepository {
  private store = new Map<string, AuditEntry>();

  /** Insert-only: an existing entry can never be overwritten. Anchor fields are set via applyAnchorResult. */
  save(entry: AuditEntry): AuditEntry {
    if (this.store.has(entry.auditId)) throw new AuditImmutableError(entry.auditId);
    const frozen = Object.freeze({ ...entry });
    this.store.set(entry.auditId, frozen);
    return frozen;
  }

  findById(auditId: string): AuditEntry | undefined {
    return this.store.get(auditId);
  }

  findAll(): AuditEntry[] {
    return [...this.store.values()];
  }

  delete(auditId: string): boolean {
    return this.store.delete(auditId);
  }

  findUnanchored(): AuditEntry[] {
    return [...this.store.values()].filter((entry) => !entry.stellarTxHash);
  }

  applyAnchorResult(result: BatchAnchorResult): AuditEntry[] {
    const updated: AuditEntry[] = [];

    for (const { auditId, merkleProof } of result.entries) {
      const entry = this.store.get(auditId);
      // Anchor fields are write-once: replayed or conflicting results leave stored proofs untouched.
      if (!entry || entry.stellarTxHash) continue;

      const anchored: AuditEntry = Object.freeze({
        ...entry,
        stellarTxHash: result.stellarTxHash,
        merkleRoot: result.merkleRoot,
        anchoredAt: result.anchoredAt,
        anchorMode: result.mode,
        merkleProof,
      });
      this.store.set(auditId, anchored);
      updated.push(anchored);
    }

    return updated;
  }

  findAllInRange(clinicId: string, from?: string, to?: string): AuditEntry[] {
    const results: AuditEntry[] = [];

    for (const entry of this.store.values()) {
      if (entry.clinicId !== clinicId) continue;
      if (from && entry.createdAt < from) continue;
      if (to && entry.createdAt > to) continue;
      results.push(entry);
    }

    results.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return results;
  }

  query(q: AuditQuery): { entries: AuditEntry[]; total: number } {
    let results: AuditEntry[] = [];

    for (const entry of this.store.values()) {
      if (entry.clinicId !== q.clinicId) continue;
      if (q.action && entry.action !== q.action) continue;
      if (q.actorId && entry.actorId !== q.actorId) continue;
      if (q.targetId && entry.targetId !== q.targetId) continue;
      if (q.from && entry.createdAt < q.from) continue;
      if (q.to && entry.createdAt > q.to) continue;
      if (q.anchored !== undefined && Boolean(entry.stellarTxHash) !== q.anchored) continue;
      results.push(entry);
    }

    results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const total = results.length;
    const page = q.page ?? 1;
    const limit = q.limit ?? 50;
    const offset = (page - 1) * limit;
    results = results.slice(offset, offset + limit);

    return { entries: results, total };
  }

  /** Cursor-paginated variant of `query`: newest first, stable while entries are appended, no total. */
  queryPage(q: AuditQuery & { cursor?: string }): CursorPage<AuditEntry> {
    const matching = this.query({ ...q, page: 1, limit: Number.MAX_SAFE_INTEGER }).entries.sort((a, b) =>
      `${b.createdAt}|${b.auditId}`.localeCompare(`${a.createdAt}|${a.auditId}`),
    );
    return paginateByCursor(matching, (e) => `${e.createdAt}|${e.auditId}`, q.cursor || undefined, q.limit ?? 50);
  }

  _reset(): void {
    this.store.clear();
  }
}

export const auditStore = new AuditRepository();
