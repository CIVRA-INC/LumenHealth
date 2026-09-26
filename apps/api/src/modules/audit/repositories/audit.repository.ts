import { Injectable } from '@nestjs/common';
import type { AuditEntry, AuditQuery, BatchAnchorResult } from "@lumen/types";

@Injectable()
export class AuditRepository {
  private store = new Map<string, AuditEntry>();

  save(entry: AuditEntry): AuditEntry {
    this.store.set(entry.auditId, entry);
    return entry;
  }

  findById(auditId: string): AuditEntry | undefined {
    return this.store.get(auditId);
  }

  findUnanchored(): AuditEntry[] {
    return [...this.store.values()].filter((entry) => !entry.stellarTxHash);
  }

  applyAnchorResult(result: BatchAnchorResult): AuditEntry[] {
    const updated: AuditEntry[] = [];

    for (const { auditId, merkleProof } of result.entries) {
      const entry = this.store.get(auditId);
      if (!entry) continue;

      const anchored: AuditEntry = {
        ...entry,
        stellarTxHash: result.stellarTxHash,
        merkleRoot: result.merkleRoot,
        anchoredAt: result.anchoredAt,
        anchorMode: result.mode,
        merkleProof,
      };
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

  _reset(): void {
    this.store.clear();
  }
}

export const auditStore = new AuditRepository();
