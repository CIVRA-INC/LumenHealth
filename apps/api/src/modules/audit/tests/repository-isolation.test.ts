import { beforeEach, describe, expect, it } from "vitest";
import type { AuditEntry } from "@lumen/types";
import { AuditRepository } from "../repositories/audit.repository.js";

const entry = (): AuditEntry =>
  ({
    auditId: "a1",
    clinicId: "c1",
    actorId: "u1",
    action: "staff.invited",
    targetId: "t1",
    createdAt: "2026-01-01T00:00:00.000Z",
    sha256Hash: "h",
    merkleProof: [{ hash: "x", position: "left" }],
  }) as unknown as AuditEntry;

describe("AuditRepository isolation", () => {
  let repo: AuditRepository;
  beforeEach(() => {
    repo = new AuditRepository();
  });

  it("stored entries cannot be modified in place, including nested proof data", () => {
    repo.save(entry());
    const found = repo.findById("a1")!;
    expect(() => {
      (found as { action: string }).action = "other";
    }).toThrow();
    expect(() => {
      (found.merkleProof as unknown as { hash: string; position: string }[]).push({
        hash: "y",
        position: "right",
      });
    }).toThrow();
    expect(repo.findById("a1")!.action).toBe("staff.invited");
  });

  it("mutating the object passed to save() does not change the stored entry", () => {
    const input = entry();
    repo.save(input);
    input.action = "tampered" as AuditEntry["action"];
    (input.merkleProof as unknown as { hash: string }[])[0]!.hash = "forged";
    const stored = repo.findById("a1")!;
    expect(stored.action).toBe("staff.invited");
    expect((stored.merkleProof as unknown as { hash: string }[])[0]!.hash).toBe("x");
  });
});
