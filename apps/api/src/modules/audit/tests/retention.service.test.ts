import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { AuditEntry } from "@lumen/types";
import { hashAuditEntry } from "@lumen/types";
import { vi } from "vitest";
import { AuditRepository } from "../repositories/audit.repository.js";
import {
  AuditArchiveRepository,
  JsonFileArchiveSink,
} from "../repositories/audit-archive.repository.js";
import {
  HOT_TIER_DAYS,
  MIN_RETENTION_YEARS,
  RETENTION_POLICY_VERSION,
  RetentionService,
} from "../services/retention.service.js";
import { AuditService } from "../services/audit.service.js";
import type { StellarVerifierClient } from "../services/stellar-verifier.client.js";

/**
 * Retention, legal hold and archival (#1330): policy doc in
 * docs/audit-retention-policy.md; these tests pin the enforcement — old
 * anchored entries archive, holds block archival and deletion, and archived
 * entries verify end-to-end (hot store and from a file-backed sink).
 */

const NOW = new Date("2026-06-01T00:00:00.000Z");
const OLD = "2026-01-01T00:00:00.000Z"; // > HOT_TIER_DAYS before NOW
const RECENT = "2026-05-30T00:00:00.000Z";

function isoDaysBefore(now: Date, days: number): string {
  return new Date(now.getTime() - days * 86_400_000).toISOString();
}

function anchoredEntry(options: {
  auditId: string;
  clinicId?: string;
  createdAt: string;
  anchored?: boolean;
}): AuditEntry {
  const unhashed = {
    auditId: options.auditId,
    clinicId: options.clinicId ?? "clinic-1",
    action: "staff.role_changed",
    actorId: "u1",
    actorRole: "owner",
    targetType: "staff",
    targetId: "t1",
    ipAddress: "10.0.0.1",
    userAgent: "test-agent",
    createdAt: options.createdAt,
  };
  const sha256Hash = hashAuditEntry(unhashed as import("@lumen/types").HashableAuditEntry);
  const anchored =
    options.anchored === undefined ? true : options.anchored;
  return {
    ...unhashed,
    sha256Hash,
    ...(anchored && {
      stellarTxHash: `tx-${options.auditId}`,
      merkleRoot: sha256Hash, // empty proof resolves iff root === entry hash
      merkleProof: [],
      anchoredAt: options.createdAt,
      anchorMode: "batched",
    }),
  } as AuditEntry;
}

function fakeClient(roots: Map<string, string>) {
  return {
    fetchAnchoredMerkleRoot: vi.fn(async (txHash: string) => roots.get(txHash) ?? null),
  } as unknown as StellarVerifierClient;
}

function graph() {
  const repo = new AuditRepository();
  const archive = new AuditArchiveRepository();
  const retention = new RetentionService(repo, archive);
  const roots = new Map<string, string>();
  const add = (entry: AuditEntry) => {
    repo.save(entry);
    if (entry.stellarTxHash) roots.set(entry.stellarTxHash, entry.merkleRoot ?? "");
  };
  const auditService = new AuditService(repo, fakeClient(roots), retention);
  return { repo, archive, retention, auditService, add };
}

describe("retention cycle", () => {
  it("archives old anchored entries and they still verify end-to-end", async () => {
    const { repo, archive, retention, auditService, add } = graph();
    add(anchoredEntry({ auditId: "a1", createdAt: OLD }));

    const report = await retention.runRetentionCycle(NOW);
    expect(report).toMatchObject({ archived: 1, skippedUnderHold: 0, hotEntriesRemaining: 0 });
    expect(repo.findById("a1")).toBeUndefined();

    const record = await archive.find("a1");
    expect(record?.policyVersion).toBe(RETENTION_POLICY_VERSION);
    expect(record?.entry.merkleProof).toEqual([]); // evidence preserved

    // AC: verification works on archived entries.
    expect(await retention.findEntryIncludingArchive("a1")).toEqual(record?.entry);
    const verdict = await auditService.verifyAuditEntry("clinic-1", "a1");
    expect(verdict).toMatchObject({ status: "verified" });
  });

  it("legal hold blocks archival until released", async () => {
    const { repo, retention, add } = graph();
    add(anchoredEntry({ auditId: "h1", createdAt: OLD }));
    const hold = retention.placeHold({ clinicId: "clinic-1", reason: "litigation", placedBy: "owner-1", now: NOW });

    const blocked = await retention.runRetentionCycle(NOW);
    expect(blocked).toMatchObject({ archived: 0, skippedUnderHold: 1 });
    expect(repo.findById("h1")).toBeDefined();

    retention.releaseHold(hold.holdId, NOW);
    const after = await retention.runRetentionCycle(NOW);
    expect(after).toMatchObject({ archived: 1, skippedUnderHold: 0 });
    expect(repo.findById("h1")).toBeUndefined();
  });

  it("a global hold covers every clinic", () => {
    const { retention } = graph();
    retention.placeHold({ clinicId: "*", reason: "regulator review", placedBy: "owner-1", now: NOW });
    expect(retention.isUnderHold("clinic-1")).toBe(true);
    expect(retention.isUnderHold("clinic-9")).toBe(true);
  });

  it("recent and unanchored entries stay hot", async () => {
    const { repo, retention, add } = graph();
    add(anchoredEntry({ auditId: "r1", createdAt: RECENT }));
    add(anchoredEntry({ auditId: "u1", createdAt: OLD, anchored: false }));

    const report = await retention.runRetentionCycle(NOW);
    expect(report).toMatchObject({ archived: 0, skippedTooRecent: 1, skippedUnanchored: 1 });
    expect(repo.findById("r1")).toBeDefined();
    expect(repo.findById("u1")).toBeDefined();
  });

  it("cycle respects a custom 'now' relative to the hot tier", async () => {
    const { repo, retention, add } = graph();
    add(anchoredEntry({ auditId: "c1", createdAt: OLD }));
    const justInside = new Date(Date.parse(OLD) + (HOT_TIER_DAYS - 1) * 86_400_000);
    const report = await retention.runRetentionCycle(justInside);
    expect(report).toMatchObject({ archived: 0, skippedTooRecent: 1 });
    expect(repo.findById("c1")).toBeDefined();
  });
});

describe("deletion gate", () => {
  const recordFor = (createdAt: string) => ({
    entry: anchoredEntry({ auditId: "d1", createdAt }),
    archivedAt: NOW.toISOString(),
    policyVersion: RETENTION_POLICY_VERSION,
  });

  it("refuses deletion before the minimum retention floor", () => {
    const { retention } = graph();
    const young = recordFor(isoDaysBefore(NOW, MIN_RETENTION_YEARS * 365 - 30));
    const verdict = retention.canDelete(young, NOW);
    expect(verdict.allowed).toBe(false);
    if (!verdict.allowed) expect(verdict.reason).toContain("minimum retention");
  });

  it("allows deletion once the floor is served, but not under hold", () => {
    const { retention } = graph();
    const old = recordFor(isoDaysBefore(NOW, MIN_RETENTION_YEARS * 365 + 30));
    expect(retention.canDelete(old, NOW).allowed).toBe(true);

    retention.placeHold({ clinicId: "clinic-1", reason: "audit", placedBy: "o", now: NOW });
    const held = retention.canDelete(old, NOW);
    expect(held.allowed).toBe(false);
    if (!held.allowed) expect(held.reason).toContain("legal hold");
  });
});

describe("file-backed cold sink", () => {
  it("round-trips the full record and verification still works from disk", async () => {
    const dir = mkdtempSync(join(tmpdir(), "lumen-archive-"));
    try {
      const { archive, retention, auditService, add } = graph();
      archive.setSink(new JsonFileArchiveSink(dir));
      add(anchoredEntry({ auditId: "disk-1", createdAt: OLD }));

      await retention.runRetentionCycle(NOW);
      const record = await archive.find("disk-1");
      expect(record?.entry.auditId).toBe("disk-1");
      expect(record?.entry.stellarTxHash).toBe("tx-disk-1");

      const verdict = await auditService.verifyAuditEntry("clinic-1", "disk-1");
      expect(verdict).toMatchObject({ status: "verified" });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
