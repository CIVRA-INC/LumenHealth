import { Injectable } from '@nestjs/common';
import { detectSequenceGaps, isCompleteRange } from '@lumen/types';
import type { AuditEntry } from '@lumen/types';
import { AuditRepository } from '../repositories/audit.repository.js';

export type ChainState = {
  lastHash: string | undefined;
  lastSequence: number | undefined;
};

export type ChainReport = {
  sequenceGaps: number[];
  firstSequence?: number;
  lastSequence?: number;
  completeRange: boolean;
};

@Injectable()
export class ChainService {
  constructor(private readonly auditRepository: AuditRepository) {}

  private clinicEntries(clinicId: string): AuditEntry[] {
    return this.auditRepository
      .findAllInRange(clinicId)
      .filter((e: AuditEntry) => e.sequence !== undefined)
      .sort((a: AuditEntry, b: AuditEntry) => (a.sequence ?? 0) - (b.sequence ?? 0));
  }

  getStateForClinic(clinicId: string): ChainState {
    const entries = this.clinicEntries(clinicId);
    const last = entries[entries.length - 1];
    if (!last) return { lastHash: undefined, lastSequence: undefined };
    return { lastHash: last.sha256Hash, lastSequence: last.sequence };
  }

  reportForClinic(clinicId: string, from?: number, to?: number): ChainReport {
    const entries = this.clinicEntries(clinicId);
    const seqs = entries.map((e: AuditEntry) => e.sequence as number);
    const first = seqs.length ? (from ?? seqs[0]) : undefined;
    const last = seqs.length ? (to ?? seqs[seqs.length - 1]) : undefined;
    const gaps = detectSequenceGaps(seqs);
    return {
      sequenceGaps: gaps,
      firstSequence: seqs.length ? seqs[0] : undefined,
      lastSequence: seqs.length ? seqs[seqs.length - 1] : undefined,
      completeRange: isCompleteRange(seqs, first, last),
    };
  }

  reportFromSequences(seqs: number[], from?: number, to?: number): ChainReport {
    const sorted = [...seqs].sort((a: number, b: number) => a - b);
    const first = sorted.length ? (from ?? sorted[0]) : undefined;
    const last = sorted.length ? (to ?? sorted[sorted.length - 1]) : undefined;
    const gaps = detectSequenceGaps(sorted);
    return {
      sequenceGaps: gaps,
      firstSequence: sorted.length ? sorted[0] : undefined,
      lastSequence: sorted.length ? sorted[sorted.length - 1] : undefined,
      completeRange: isCompleteRange(sorted, first, last),
    };
  }

  /**
   * #1326: verify that `entry` still commits to its true predecessor.
   * A deleted predecessor leaves a sequence gap; a reordered one leaves a
   * `prevHash` that no longer matches the entry at `sequence - 1`. Either
   * way the chain is broken at this entry.
   */
  verifyLinkage(
    clinicId: string,
    entry: AuditEntry
  ): { ok: boolean; reason?: string } {
    if (entry.sequence === undefined) return { ok: true };
    if (entry.sequence === 1) {
      return entry.prevHash === undefined
        ? { ok: true }
        : { ok: false, reason: "first entry in clinic chain must have no prevHash" };
    }
    const predecessor = this.clinicEntries(clinicId).find(
      (e: AuditEntry) => e.sequence === (entry.sequence as number) - 1
    );
    if (!predecessor) {
      return {
        ok: false,
        reason: `predecessor with sequence ${entry.sequence - 1} is missing — entry deleted from the chain`,
      };
    }
    if (entry.prevHash !== predecessor.sha256Hash) {
      return {
        ok: false,
        reason: "prevHash does not match its predecessor — entries were reordered or relinked",
      };
    }
    return { ok: true };
  }
}
