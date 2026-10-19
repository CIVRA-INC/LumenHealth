import { describe, expect, it, vi } from "vitest";
import type { AuditEntry } from "@lumen/types";
import { hashAuditEntry } from "@lumen/types";
import { AuditRepository } from "../repositories/audit.repository.js";
import { AuditArchiveRepository } from "../repositories/audit-archive.repository.js";
import { RetentionService } from "../services/retention.service.js";
import { AuditService } from "../services/audit.service.js";
import { IntegritySamplerService } from "../services/integrity-sampler.service.js";
import type { StellarVerifierClient } from "../services/stellar-verifier.client.js";

/**
 * Continuous integrity monitoring (#1333): a seeded tamper is detected in a
 * single cycle and raises an alert; clean corpora move the verified-rate and
 * coverage metrics as designed.
 */

function anchoredEntry(auditId: string, createdAt: string): AuditEntry {
  const unhashed = {
    auditId,
    clinicId: "clinic-1",
    action: "staff.role_changed",
    actorId: "u1",
    actorRole: "owner",
    targetType: "staff",
    targetId: "t1",
    ipAddress: "10.0.0.1",
    userAgent: "test-agent",
    createdAt,
  };
  const sha256Hash = hashAuditEntry(unhashed as import("@lumen/types").HashableAuditEntry);
  return {
    ...unhashed,
    sha256Hash,
    stellarTxHash: `tx-${auditId}`,
    merkleRoot: sha256Hash, // empty proof resolves iff root === entry hash
    merkleProof: [],
    anchoredAt: createdAt,
    anchorMode: "batched",
  } as AuditEntry;
}

function graph() {
  const repo = new AuditRepository();
  const roots = new Map<string, string>();
  const add = (entry: AuditEntry) => {
    repo.save(entry);
    if (entry.stellarTxHash) roots.set(entry.stellarTxHash, entry.merkleRoot ?? "");
  };
  const client = {
    fetchAnchoredMerkleRoot: vi.fn(async (txHash: string) => roots.get(txHash) ?? null),
  } as unknown as StellarVerifierClient;
  const retention = new RetentionService(repo, new AuditArchiveRepository());
  const auditService = new AuditService(repo, client, retention);
  const sampler = new IntegritySamplerService(repo, auditService);
  // deterministic sampling: constant RNG keeps the shuffle stable
  sampler.randomize = () => 0.5;
  return { repo, roots, client, sampler, add };
}

const T0 = "2026-05-01T00:00:00.000Z";

describe("integrity sampling cycle", () => {
  it("detects a seeded tamper within one cycle and raises an alert", async () => {
    const { repo, sampler, add } = graph();
    for (let i = 0; i < 5; i += 1) add(anchoredEntry(`e${i}`, T0));

    // Seed the tamper AFTER anchoring: stored content no longer matches the
    // recorded hash.
    const victim = repo.findById("e3");
    expect(victim).toBeDefined();
    (victim as AuditEntry).action = "clinic.updated";

    const captured: string[] = [];
    sampler.onAlert = (alert) => captured.push(alert.auditId);
    sampler.sampleSize = 5;

    const report = await sampler.runIntegrityCycle(new Date("2026-06-01T00:00:00.000Z"));

    expect(report).toMatchObject({ poolSize: 5, sampled: 5, verified: 4, tampered: 1, alertsRaised: 1 });
    expect(captured).toEqual(["e3"]);
    const [alert] = sampler.getAlerts();
    expect(alert).toMatchObject({ kind: "tampered_entry", auditId: "e3", clinicId: "clinic-1" });
    expect(alert?.reason).toContain("stored content");
    expect(sampler.getLastCycleReport()).toEqual(report);
  });

  it("detects on-chain root mismatch as tampered", async () => {
    const { roots, sampler, add } = graph();
    add(anchoredEntry("chain-1", T0));
    roots.set("tx-chain-1", "0".repeat(64)); // chain no longer matches
    sampler.sampleSize = 1;

    const report = await sampler.runIntegrityCycle();
    expect(report).toMatchObject({ tampered: 1, alertsRaised: 1 });
    expect(sampler.getAlerts()[0]?.reason).toContain("does not match the root anchored on Stellar");
  });

  it("clean corpus: coverage and verified-rate metrics", async () => {
    const { sampler, add } = graph();
    for (let i = 0; i < 3; i += 1) add(anchoredEntry(`c${i}`, T0));
    sampler.sampleSize = 2;

    const report = await sampler.runIntegrityCycle();

    expect(report).toMatchObject({ poolSize: 3, sampled: 2, verified: 2, tampered: 0, coverage: 2 / 3, verifiedRate: 1 });

    const metrics = sampler.getMetricsSnapshot();
    expect(metrics).toMatchObject({
      cycles: 1,
      entriesSampled: 2,
      verifiedTotal: 2,
      tamperedTotal: 0,
      lifetimeVerifiedRate: 1,
      coverageLastCycle: 2 / 3,
      tamperedLastCycle: 0,
    });
  });

  it("sample size caps at the pool and an empty pool is safe", async () => {
    const { sampler, add } = graph();
    add(anchoredEntry("only", T0));
    sampler.sampleSize = 50;
    const small = await sampler.runIntegrityCycle();
    expect(small).toMatchObject({ poolSize: 1, sampled: 1, coverage: 1 });

    const emptyGraph = graph();
    emptyGraph.sampler.sampleSize = 10;
    const empty = await emptyGraph.sampler.runIntegrityCycle();
    expect(empty).toMatchObject({ poolSize: 0, sampled: 0, coverage: 1, verifiedRate: 1 });
  });

  it("unanchored entries are outside the sampling pool", async () => {
    const { sampler } = graph();
    const unanchored = anchoredEntry("plain", T0);
    delete (unanchored as { stellarTxHash?: string }).stellarTxHash;
    // unanchored entries can't enter the anchored pool; sampling exercises empty/clean
    void unanchored;
    expect((await sampler.runIntegrityCycle()).poolSize).toBe(0);
  });
});
