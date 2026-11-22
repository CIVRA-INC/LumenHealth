import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  canonicalize,
  computeEntriesDigest,
  hashAuditEntry,
  isCriticalAuditAction,
  verifyMerkleProof,
} from "@lumen/types";
import type {
  AuditAction,
  AuditEntry,
  AuditExportBundle,
  AuditExportManifest,
  AuditQuery,
  AuditVerifyResponse,
  BatchAnchorResult,
  HashableAuditEntry,
  MerkleProofStep,
  UserRole,
} from "@lumen/types";
import { AuditRepository } from "../repositories/audit.repository.js";
import { StellarVerifierClient } from "./stellar-verifier.client.js";
import { RetentionService } from "./retention.service.js";

export type RecordAuditParams = {
  clinicId: string;
  action: AuditAction;
  actorId: string;
  actorRole: UserRole;
  targetId?: string;
  targetType?: "staff" | "clinic" | "invitation";
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class AuditService {
  private readonly chainService: ChainService;

  constructor(
    private readonly auditRepository: AuditRepository,
    private readonly stellarVerifierClient: StellarVerifierClient,
    private readonly retentionService: RetentionService,
    chainService?: ChainService,
  ) {
    this.chainService = chainService ?? new ChainService(auditRepository);
  }

  recordAudit(params: RecordAuditParams): AuditEntry {
    const chain = this.chainService.getStateForClinic(params.clinicId);
    const unhashed = {
      auditId: randomUUID(),
      clinicId: params.clinicId,
      action: params.action,
      actorId: params.actorId,
      actorRole: params.actorRole,
      targetId: params.targetId,
      targetType: params.targetType,
      before: params.before,
      after: params.after,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      createdAt: new Date().toISOString(),
      sequence: (chain.lastSequence ?? 0) + 1,
      prevHash: chain.lastHash,
    };
    const entry: AuditEntry = {
      ...unhashed,
      sha256Hash: hashAuditEntry(unhashed),
    };

    const saved = this.auditRepository.save(entry);

    if (isCriticalAuditAction(saved.action)) {
      void this.anchorImmediately(saved).catch((error) => {
        console.error(`[audit] immediate anchor failed for ${saved.auditId} (${saved.action}):`, error);
      });
    }

    return saved;
  }

  async anchorImmediately(
    entry: Pick<AuditEntry, "auditId" | "sha256Hash" | "createdAt">
  ): Promise<AuditEntry | null> {
    const result = await this.stellarVerifierClient.anchorEntriesImmediately([{ auditId: entry.auditId, sha256Hash: entry.sha256Hash, createdAt: entry.createdAt }]);
    const [updated] = this.auditRepository.applyAnchorResult(result);
    return updated ?? null;
  }

  queryAuditLog(q: AuditQuery): { entries: AuditEntry[]; total: number } {
    return this.auditRepository.query(q);
  }

  queryAuditLogPage(q: AuditQuery & { cursor?: string }) {
    return this.auditRepository.queryPage(q);
  }

  getUnanchoredEntries(): { auditId: string; sha256Hash: string; createdAt: string }[] {
    return this.auditRepository.findUnanchored().map((entry) => ({
      auditId: entry.auditId,
      sha256Hash: entry.sha256Hash,
      createdAt: entry.createdAt,
    }));
  }

  applyBatchAnchorResult(result: BatchAnchorResult): AuditEntry[] {
    const updated = this.auditRepository.applyAnchorResult(result);

    const clinicIds = [...new Set(updated.map((entry) => entry.clinicId))];
    for (const clinicId of clinicIds) {
      const entryCount = updated.filter((entry) => entry.clinicId === clinicId).length;
      this.recordAudit({
        clinicId,
        action: "batch.anchored",
        actorId: "stellar-service",
        actorRole: "system",
        after: {
          merkleRoot: result.merkleRoot,
          stellarTxHash: result.stellarTxHash,
          anchoredAt: result.anchoredAt,
          entryCount,
        },
      });
    }

    return updated;
  }

  /** The full entry, or `null` when it does not exist or belongs to another clinic. Includes archived entries. */
  async getAuditEntry(clinicId: string, auditId: string): Promise<AuditEntry | null> {
    const entry = await this.retentionService.findEntryIncludingArchive(auditId);
    return entry && entry.clinicId === clinicId ? entry : null;
  }

  async verifyAuditEntry(
    clinicId: string,
    auditId: string
  ): Promise<AuditVerifyResponse | null> {
    // Hot store first, then the cold archive — archived entries verify
    // exactly like hot ones (retention policy v1.0, #1330).
    const entry = await this.retentionService.findEntryIncludingArchive(auditId);
    if (!entry || entry.clinicId !== clinicId) {
      return null;
    }

    const chain = this.chainService.reportForClinic(clinicId);

    const { sha256Hash: storedHash, stellarTxHash, merkleRoot, anchoredAt, merkleProof, anchorMode, ...hashable } =
      entry;
    void anchoredAt;
    const recomputedHash = hashAuditEntry(hashable);
    const checkedAt = new Date().toISOString();

    if (recomputedHash !== storedHash) {
      return {
        auditId,
        status: "tampered",
        recomputedHash,
        storedHash,
        merkleRoot,
        stellarTxHash,
        checkedAt,
        reason: "stored content no longer matches its recorded hash",
        ...chain,
      };
    }

    // #1326: the per-clinic hash chain must still link this entry to its
    // predecessor — a deleted or reordered entry fails here even when its
    // own content hash is intact.
    const linkage = this.chainService.verifyLinkage(clinicId, entry);
    if (!linkage.ok) {
      return {
        auditId,
        status: "tampered",
        recomputedHash,
        storedHash,
        merkleRoot,
        stellarTxHash,
        checkedAt,
        reason: linkage.reason,
        ...chain,
      };
    }

    if (!stellarTxHash || !merkleRoot || !merkleProof) {
      return { auditId, status: "unanchored", recomputedHash, storedHash, checkedAt, ...chain };
    }

    const chainRoot = await this.stellarVerifierClient.fetchAnchoredMerkleRoot(stellarTxHash);

    if (chainRoot === null || chainRoot !== merkleRoot) {
      return {
        auditId,
        status: "tampered",
        recomputedHash,
        storedHash,
        merkleRoot,
        stellarTxHash,
        checkedAt,
        reason: "stored merkle root does not match the root anchored on Stellar",
        ...chain,
      };
    }

    if (!verifyMerkleProof(recomputedHash, merkleProof as MerkleProofStep[], chainRoot)) {
      return {
        auditId,
        status: "tampered",
        recomputedHash,
        storedHash,
        merkleRoot,
        stellarTxHash,
        checkedAt,
        reason: "merkle proof does not resolve to the on-chain root",
        ...chain,
      };
    }

    return {
      auditId,
      status: "verified",
      recomputedHash,
      storedHash,
      merkleRoot,
      stellarTxHash,
      anchorMode,
      checkedAt,
      ...chain,
    };
  }

  async buildAuditExport(
    clinicId: string,
    from?: string,
    to?: string
  ): Promise<AuditExportBundle> {
    const entries = this.auditRepository.findAllInRange(clinicId, from, to);

    const manifest: AuditExportManifest = {
      clinicId,
      generatedAt: new Date().toISOString(),
      range: { from, to },
      entryCount: entries.length,
      entriesDigest: computeEntriesDigest(entries),
    };

    const { signature, publicKey } = await this.stellarVerifierClient.signExportManifest(canonicalize(manifest));
    const chain = this.chainService.reportForClinic(clinicId);

    return { manifest, signature, signingPublicKey: publicKey, entries, ...chain };
  }
}
