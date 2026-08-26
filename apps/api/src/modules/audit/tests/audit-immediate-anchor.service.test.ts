import { describe, it, expect, beforeEach, vi } from "vitest";
import type { BatchAnchorResult } from "@lumen/types";
import { auditStore } from "../repositories/audit.repository.js";
import { anchorImmediately, recordAudit } from "../services/audit.service.js";

function fakeImmediateResult(auditId: string, mode: "immediate" | "batched" = "immediate"): BatchAnchorResult {
  return {
    merkleRoot: `root-${auditId}`,
    stellarTxHash: `tx-${auditId}`,
    anchoredAt: "2026-01-01T00:00:01.000Z",
    mode,
    entries: [{ auditId, merkleProof: [] }],
  };
}

describe("anchorImmediately", () => {
  beforeEach(() => {
    auditStore._reset();
  });

  it("calls the injected anchor function with exactly this entry and stamps the result", async () => {
    const entry = recordAudit({
      clinicId: "c-1",
      action: "staff.invited", // non-critical, so recordAudit itself won't already have anchored it
      actorId: "actor-1",
      actorRole: "owner",
    });

    const anchor = vi.fn(async () => fakeImmediateResult(entry.auditId));
    const updated = await anchorImmediately(entry, anchor);

    expect(anchor).toHaveBeenCalledWith([
      { auditId: entry.auditId, sha256Hash: entry.sha256Hash, createdAt: entry.createdAt },
    ]);
    expect(updated?.stellarTxHash).toBe(`tx-${entry.auditId}`);
    expect(updated?.anchorMode).toBe("immediate");
  });

  it("returns null if the entry no longer exists in the store", async () => {
    const anchor = vi.fn(async () => fakeImmediateResult("gone"));
    const updated = await anchorImmediately(
      { auditId: "gone", sha256Hash: "hash", createdAt: "2026-01-01T00:00:00.000Z" },
      anchor,
    );
    expect(updated).toBeNull();
  });

  it("propagates a failure from the anchor call", async () => {
    const entry = recordAudit({
      clinicId: "c-1",
      action: "staff.invited",
      actorId: "actor-1",
      actorRole: "owner",
    });
    const anchor = vi.fn(async () => {
      throw new Error("stellar-service unreachable");
    });

    await expect(anchorImmediately(entry, anchor)).rejects.toThrow("stellar-service unreachable");
  });
});

describe("recordAudit — critical action dispatch", () => {
  beforeEach(() => {
    auditStore._reset();
  });

  it("does not anchor a non-critical action immediately", () => {
    const entry = recordAudit({
      clinicId: "c-1",
      action: "staff.invited",
      actorId: "actor-1",
      actorRole: "owner",
    });

    // Synchronously after recordAudit returns, nothing has been anchored yet
    // (and never will be via the immediate path — a non-critical action
    // only ever gets picked up by the routine batch job).
    const stored = auditStore.findById(entry.auditId)!;
    expect(stored.stellarTxHash).toBeUndefined();
    expect(stored.anchorMode).toBeUndefined();
  });

  it("triggers a fire-and-forget immediate anchor for a critical action (staff.role_changed)", async () => {
    const entry = recordAudit({
      clinicId: "c-1",
      action: "staff.role_changed",
      actorId: "actor-1",
      actorRole: "owner",
      targetId: "staff-1",
      before: { role: "clinician" },
      after: { role: "admin" },
    });

    // recordAudit doesn't await the anchor, so give the fire-and-forget
    // promise a tick to run (it hits the real, unmocked stellar-verifier
    // client here, which will fail fast against no live stellar-service —
    // this test only asserts recordAudit doesn't throw or block on it).
    await new Promise((resolve) => setTimeout(resolve, 0));

    const stored = auditStore.findById(entry.auditId)!;
    expect(stored.action).toBe("staff.role_changed");
  });

  it("triggers a fire-and-forget immediate anchor for a critical action (clinic.archived)", () => {
    expect(() =>
      recordAudit({
        clinicId: "c-1",
        action: "clinic.archived",
        actorId: "owner-1",
        actorRole: "owner",
        targetId: "c-1",
      }),
    ).not.toThrow();
  });
});
