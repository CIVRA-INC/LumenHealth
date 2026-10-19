import { describe, expect, it } from "vitest";
import { AuditImmutableError, AuditRepository } from "../repositories/audit.repository.js";
import { idempotencyStore } from "../services/idempotency.store.js";
import type { AuditEntry, BatchAnchorResult } from "@lumen/types";

const entry = (auditId: string): AuditEntry =>
  ({ auditId, clinicId: "c1", action: "staff.invited", actorId: "u1", createdAt: new Date().toISOString(), sha256Hash: "h" }) as AuditEntry;

const result: BatchAnchorResult = {
  stellarTxHash: "tx1",
  merkleRoot: "root",
  anchoredAt: "2026-01-01T00:00:00Z",
  mode: "batch",
  entries: [{ auditId: "a1", merkleProof: [] }],
} as unknown as BatchAnchorResult;

describe("append-only audit store", () => {
  it("rejects overwriting an entry and freezes stored entries", () => {
    const repo = new AuditRepository();
    const saved = repo.save(entry("a1"));
    expect(() => repo.save(entry("a1"))).toThrow(AuditImmutableError);
    expect(Object.isFrozen(saved)).toBe(true);
  });

  it("applies anchor fields once and ignores replays", () => {
    const repo = new AuditRepository();
    repo.save(entry("a1"));
    expect(repo.applyAnchorResult(result)).toHaveLength(1);
    expect(repo.applyAnchorResult(result)).toHaveLength(0);
    expect(repo.applyAnchorResult({ ...result, stellarTxHash: "tx2", merkleRoot: "other" })).toHaveLength(0);
    expect(repo.findById("a1")?.stellarTxHash).toBe("tx1");
  });
});

describe("idempotency store", () => {
  it("returns the stored response for a repeated key", () => {
    idempotencyStore._reset();
    idempotencyStore.set("tx1", { updated: 2 });
    expect(idempotencyStore.get("tx1")).toEqual({ updated: 2 });
    expect(idempotencyStore.get("tx2")).toBeUndefined();
  });
});
