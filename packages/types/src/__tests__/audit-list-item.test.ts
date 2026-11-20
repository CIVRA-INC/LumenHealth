import { describe, expect, it } from "vitest";
import type { AuditEntry } from "../audit.js";
import { toAuditListItem } from "../audit.js";

const entry: AuditEntry = {
  auditId: "a-1",
  clinicId: "c-1",
  action: "staff.role_changed",
  actorId: "actor-1",
  actorRole: "owner",
  targetId: "staff-1",
  targetType: "staff",
  before: { role: "cashier" },
  after: { role: "admin" },
  ipAddress: "10.0.0.1",
  userAgent: "jest",
  createdAt: "2026-03-31T10:00:00.000Z",
  sha256Hash: "hash",
};

describe("toAuditListItem", () => {
  it("keeps only list columns and drops snapshots, proofs and client metadata", () => {
    const item = toAuditListItem({ ...entry, merkleProof: [{ hash: "h", position: "left" }], merkleRoot: "root" });

    expect(item).toEqual({
      auditId: "a-1",
      createdAt: "2026-03-31T10:00:00.000Z",
      action: "staff.role_changed",
      actorId: "actor-1",
      actorRole: "owner",
      targetType: "staff",
      targetId: "staff-1",
      anchored: false,
      anchorMode: undefined,
    });
    for (const omitted of ["before", "after", "merkleProof", "merkleRoot", "userAgent", "ipAddress", "sha256Hash", "clinicId"]) {
      expect(item).not.toHaveProperty(omitted);
    }
  });

  it("reports anchored entries with their mode", () => {
    expect(toAuditListItem({ ...entry, stellarTxHash: "tx", anchorMode: "immediate" })).toMatchObject({
      anchored: true,
      anchorMode: "immediate",
    });
  });
});
