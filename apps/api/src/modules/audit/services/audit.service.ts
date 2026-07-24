import { randomUUID } from "crypto";
import {
  canonicalize,
  hashAuditEntry,
  sha256Hash,
  verifyMerkleProof,
  type AuditAction,
  type AuditEntry,
  type AuditExportBundle,
  type AuditExportManifest,
  type AuditQuery,
  type AuditVerifyResponse,
  type BatchAnchorResult,
  type UserRole,
} from "@lumen/types";
import { auditStore } from "../repositories/audit.repository.js";
import { fetchAnchoredMerkleRoot, signExportManifest } from "./stellar-verifier.client.js";
import type { SignedPayload } from "./stellar-verifier.client.js";

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

export function recordAudit(params: RecordAuditParams): AuditEntry {
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

  return auditStore.save(entry);
}

export function queryAuditLog(q: AuditQuery): { entries: AuditEntry[]; total: number } {
  return auditStore.query(q);
}

/** Minimal shape the anchoring job needs: just enough to build a Merkle tree. */
export function getUnanchoredEntries(): { auditId: string; sha256Hash: string }[] {
  return auditStore.findUnanchored().map((entry) => ({
    auditId: entry.auditId,
    sha256Hash: entry.sha256Hash,
  }));
}

/**
 * Applies a completed Stellar batch anchor result to the entries it covers,
 * then records one `batch.anchored` audit entry per affected clinic.
 */
export function applyBatchAnchorResult(result: BatchAnchorResult): AuditEntry[] {
  const updated = auditStore.applyAnchorResult(result);

  const clinicIds = [...new Set(updated.map((entry) => entry.clinicId))];
  for (const clinicId of clinicIds) {
    const entryCount = updated.filter((entry) => entry.clinicId === clinicId).length;
    recordAudit({
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

/**
 * Recomputes an entry's hash from its currently stored content and, if
 * anchored, walks its Merkle proof against the root actually written on
 * Stellar. Returns `null` if the entry doesn't exist or belongs to a
 * different clinic (caller should treat that as a 404 — never leak that a
 * given auditId exists under someone else's clinic).
 *
 * `fetchAnchoredRoot` is injectable for tests; defaults to the real
 * stellar-service HTTP client.
 */
export async function verifyAuditEntry(
  clinicId: string,
  auditId: string,
  fetchAnchoredRoot: (txHash: string) => Promise<string | null> = fetchAnchoredMerkleRoot,
): Promise<AuditVerifyResponse | null> {
  const entry = auditStore.findById(auditId);
  if (!entry || entry.clinicId !== clinicId) {
    return null;
  }

  const { sha256Hash: storedHash, stellarTxHash, merkleRoot, anchoredAt, merkleProof, ...hashable } = entry;
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

  const chainRoot = await fetchAnchoredRoot(stellarTxHash);

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

  return { auditId, status: "verified", recomputedHash, storedHash, merkleRoot, stellarTxHash, checkedAt };
}

function computeEntriesDigest(entries: AuditEntry[]): string {
  const sorted = entries
    .map((entry) => ({ auditId: entry.auditId, sha256Hash: entry.sha256Hash }))
    .sort((a, b) => a.auditId.localeCompare(b.auditId));
  return sha256Hash(sorted);
}

/**
 * Builds a signed, externally-verifiable compliance export: every audit
 * entry in the clinic's range (with its Merkle proof and anchoring tx hash
 * already attached), plus a manifest signed by the same keypair
 * stellar-service uses to sign anchoring transactions. A third party with
 * only this bundle and public Stellar testnet access can independently
 * re-derive every hash and root — see `apps/stellar-service/src/verify-export.ts`.
 *
 * `sign` is injectable for tests; defaults to the real stellar-service call.
 */
export async function buildAuditExport(
  clinicId: string,
  from?: string,
  to?: string,
  sign: (payload: string) => Promise<SignedPayload> = signExportManifest,
): Promise<AuditExportBundle> {
  const entries = auditStore.findAllInRange(clinicId, from, to);

  const manifest: AuditExportManifest = {
    clinicId,
    generatedAt: new Date().toISOString(),
    range: { from, to },
    entryCount: entries.length,
    entriesDigest: computeEntriesDigest(entries),
  };

  const { signature, publicKey } = await sign(canonicalize(manifest));

  return { manifest, signature, signingPublicKey: publicKey, entries };
}
