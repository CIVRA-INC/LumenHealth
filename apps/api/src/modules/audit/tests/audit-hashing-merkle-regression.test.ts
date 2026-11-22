import { describe, it, expect, beforeEach } from "vitest";
import { buildMerkleTree, getMerkleProof, hashAuditEntry } from "@lumen/types";
import type { AuditEntry, BatchAnchorResult, MerkleProofStep } from "@lumen/types";
import { AuditService } from "../services/audit.service.js";
import { AuditRepository } from "../repositories/audit.repository.js";

class StubRetentionService {
  constructor(private readonly repo: AuditRepository) {}
  async findEntryIncludingArchive(auditId: string): Promise<AuditEntry | null> {
    return this.repo.findById(auditId) ?? null;
  }
}

class StubStellarVerifierClient {
  public roots = new Map<string, string>();
  async anchorEntriesImmediately() {
    return { merkleRoot: "", stellarTxHash: "", anchoredAt: "", mode: "immediate" as const, entries: [] };
  }
  async fetchAnchoredMerkleRoot(txHash: string): Promise<string | null> {
    return this.roots.get(txHash) ?? null;
  }
  async signExportManifest() {
    return { signature: "sig", publicKey: "pub" };
  }
}

function makeService() {
  const repo = new AuditRepository();
  const stellar = new StubStellarVerifierClient();
  const retention = new StubRetentionService(repo) as any;
  const service = new AuditService(repo, stellar as any, retention);
  return { repo, stellar, service };
}

describe("audit hashing regression (#1481)", () => {
  it("recordAudit hash matches @lumen/types hashAuditEntry for nested arrays and undefined fields", () => {
    const { service } = makeService();
    const entry = service.recordAudit({
      clinicId: "clinic-1",
      action: "staff.role_changed",
      actorId: "actor-1",
      actorRole: "owner",
      targetId: "staff-1",
      targetType: "staff",
      before: { role: "clinician", tags: [1, undefined, 2], meta: { a: undefined, b: "x" } } as any,
      after: { role: "admin", tags: [1, undefined, 2], meta: { b: "x" } } as any,
    });

    const { sha256Hash: _hash, stellarTxHash, merkleRoot, anchoredAt, merkleProof, anchorMode, ...hashable } = entry;
    void stellarTxHash; void merkleRoot; void anchoredAt; void merkleProof; void anchorMode;
    expect(entry.sha256Hash).toBe(hashAuditEntry(hashable));
  });
});

describe("audit merkle verification regression (#1480)", () => {
  let svc: ReturnType<typeof makeService>;
  beforeEach(() => {
    svc = makeService();
  });

  async function verifyWithProof(leafCount: number) {
    const { service, stellar } = svc;
    const entries: AuditEntry[] = [];
    for (let i = 0; i < leafCount; i++) {
      entries.push(service.recordAudit({
        clinicId: "clinic-1",
        action: "staff.role_changed",
        actorId: "actor-1",
        actorRole: "owner",
        targetId: `staff-${i}`,
        targetType: "staff",
        before: { role: "clinician", i },
        after: { role: "admin", i },
      }));
    }
    const leaves = entries.map((e) => e.sha256Hash);
    const tree = buildMerkleTree(leaves);
    const txHash = `tx-${leafCount}`;
    stellar.roots.set(txHash, tree.root);

    const anchoredAt = "2026-01-01T00:00:00.000Z";
    const result: BatchAnchorResult = {
      merkleRoot: tree.root,
      stellarTxHash: txHash,
      anchoredAt,
      mode: "batched",
      entries: entries.map((e, i) => ({ auditId: e.auditId, merkleProof: getMerkleProof(tree, i) })),
    };
    service.applyBatchAnchorResult(result);

    for (const e of entries) {
      const res = await service.verifyAuditEntry("clinic-1", e.auditId);
      expect(res?.status, `leafCount=${leafCount} auditId=${e.auditId}`).toBe("verified");
    }
  }

  it("verifies proofs for 1, 2, 3 and 8 leaves", async () => {
    await verifyWithProof(1);
    svc = makeService();
    await verifyWithProof(2);
    svc = makeService();
    await verifyWithProof(3);
    svc = makeService();
    await verifyWithProof(8);
  });

  it("returns tampered when a sibling is flipped", async () => {
    const { service, repo, stellar } = svc;
    const e1 = service.recordAudit({ clinicId: "clinic-1", action: "staff.role_changed", actorId: "a", actorRole: "owner", targetId: "t1", targetType: "staff", before: { r: 1 }, after: { r: 2 } });
    const e2 = service.recordAudit({ clinicId: "clinic-1", action: "staff.role_changed", actorId: "a", actorRole: "owner", targetId: "t2", targetType: "staff", before: { r: 3 }, after: { r: 4 } });
    const tree = buildMerkleTree([e1.sha256Hash, e2.sha256Hash]);
    const txHash = "tx-flip";
    stellar.roots.set(txHash, tree.root);
    const proof = getMerkleProof(tree, 0);
    const flipped: MerkleProofStep[] = [{ ...proof[0], hash: "0".repeat(64) }];
    // directly persist anchored fields for e1
    const stored = repo.findById(e1.auditId)!;
    repo.save({ ...stored, merkleRoot: tree.root, stellarTxHash: txHash, anchoredAt: "2026-01-01T00:00:00.000Z", merkleProof: flipped, anchorMode: "batched" });

    const res = await service.verifyAuditEntry("clinic-1", e1.auditId);
    expect(res?.status).toBe("tampered");
    expect(res?.reason).toBe("merkle proof does not resolve to the on-chain root");
  });
});
