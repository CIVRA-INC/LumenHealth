import { Injectable } from '@nestjs/common';
import { randomUUID, createHash } from 'crypto';
import type {
  AuditAction,
  AuditEntry,
  AuditExportBundle,
  AuditExportManifest,
  AuditQuery,
  AuditVerifyResponse,
  BatchAnchorResult,
  UserRole,
} from "@lumen/types";
import { AuditRepository } from "../repositories/audit.repository.js";
import { StellarVerifierClient } from "./stellar-verifier.client.js";

function canonicalize(data: unknown): string {
  if (data === null || typeof data !== "object") return JSON.stringify(data);
  if (Array.isArray(data)) return `[${data.map(canonicalize).join(",")}]`;
  const sortedKeys = Object.keys(data).sort();
  return `{${sortedKeys
    .filter((k) => (data as Record<string, unknown>)[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${canonicalize((data as Record<string, unknown>)[k])}`)
    .join(",")}}`;
}

function sha256Hash(data: unknown): string {
  const hash = createHash("sha256");
  hash.update(canonicalize(data));
  return hash.digest("hex");
}

function hashAuditEntry(entry: Omit<AuditEntry, "sha256Hash" | "stellarTxHash" | "merkleRoot" | "anchoredAt" | "merkleProof" | "anchorMode">): string {
  return sha256Hash(entry);
}

function verifyMerkleProof(hash: string, proof: { direction: 'left' | 'right', hash: string }[], root: string): boolean {
  let currentHash = hash;
  for (const step of proof) {
    const pair = step.direction === 'left' ? [step.hash, currentHash] : [currentHash, step.hash];
    currentHash = sha256Hash(pair);
  }
  return currentHash === root;
}

const CRITICAL_ACTIONS: AuditAction[] = [
  "staff.invited",
  "staff.invitation_revoked",
  "staff.archived",
  "clinic.archived",
];

function isCriticalAuditAction(action: AuditAction): boolean {
  return CRITICAL_ACTIONS.includes(action);
}

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
  constructor(
    private readonly auditRepository: AuditRepository,
    private readonly stellarVerifierClient: StellarVerifierClient
  ) {}

  recordAudit(params: RecordAuditParams): AuditEntry {
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

  async verifyAuditEntry(
    clinicId: string,
    auditId: string
  ): Promise<AuditVerifyResponse | null> {
    const entry = this.auditRepository.findById(auditId);
    if (!entry || entry.clinicId !== clinicId) {
      return null;
    }

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
      };
    }

    if (!stellarTxHash || !merkleRoot || !merkleProof) {
      return { auditId, status: "unanchored", recomputedHash, storedHash, checkedAt };
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
      };
    }

    if (!verifyMerkleProof(recomputedHash, merkleProof, chainRoot)) {
      return {
        auditId,
        status: "tampered",
        recomputedHash,
        storedHash,
        merkleRoot,
        stellarTxHash,
        checkedAt,
        reason: "merkle proof does not resolve to the on-chain root",
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
    };
  }

  async buildAuditExport(
    clinicId: string,
    from?: string,
    to?: string
  ): Promise<AuditExportBundle> {
    const entries = this.auditRepository.findAllInRange(clinicId, from, to);

    const computeEntriesDigest = (entries: AuditEntry[]): string => {
      const sorted = entries
        .map((entry) => ({ auditId: entry.auditId, sha256Hash: entry.sha256Hash }))
        .sort((a, b) => a.auditId.localeCompare(b.auditId));
      return sha256Hash(sorted);
    };

    const manifest: AuditExportManifest = {
      clinicId,
      generatedAt: new Date().toISOString(),
      range: { from, to },
      entryCount: entries.length,
      entriesDigest: computeEntriesDigest(entries),
    };

    const { signature, publicKey } = await this.stellarVerifierClient.signExportManifest(canonicalize(manifest));

    return { manifest, signature, signingPublicKey: publicKey, entries };
  }
}
