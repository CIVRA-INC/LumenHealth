import { describe, expect, it } from "vitest";
import type { AuditEntry } from "@lumen/types";
import { AuditRepository, compareAuditEntries } from "../repositories/audit.repository.js";

const CREATED_AT = "2026-03-31T10:00:00.000Z";

function entry(auditId: string, createdAt = CREATED_AT): AuditEntry {
  return {
    auditId,
    clinicId: "clinic-1",
    action: "staff.invited",
    actorId: "actor-1",
    actorRole: "owner",
    createdAt,
    sha256Hash: `hash-${auditId}`,
  };
}

function seeded(count: number): AuditRepository {
  const repo = new AuditRepository();
  // Insert in a scrambled order so insertion order cannot explain a stable result.
  const ids = Array.from({ length: count }, (_, i) => `id-${String(i).padStart(3, "0")}`);
  for (const id of [...ids].reverse()) repo.save(entry(id));
  for (const id of ids.slice(0, 5)) repo.delete(id);
  for (const id of ids.slice(0, 5)) repo.save(entry(id));
  return repo;
}

describe("audit ordering tiebreaker", () => {
  it("orders by createdAt then auditId using code-unit comparison", () => {
    expect(compareAuditEntries(entry("a"), entry("b"))).toBe(-1);
    expect(compareAuditEntries(entry("b"), entry("a"))).toBe(1);
    expect(compareAuditEntries(entry("a"), entry("a"))).toBe(0);
    // Uppercase sorts before lowercase in code-unit order (localeCompare would not do that).
    expect(compareAuditEntries(entry("B"), entry("a"))).toBe(-1);
    expect(compareAuditEntries(entry("z", "2026-01-01T00:00:00.000Z"), entry("a", "2026-01-02T00:00:00.000Z"))).toBe(-1);
  });

  it("returns identical order across 20 repeated calls with identical createdAt", () => {
    const repo = seeded(100);
    const first = repo.query({ clinicId: "clinic-1", limit: 100 }).entries.map((e) => e.auditId);
    expect(first).toHaveLength(100);
    for (let i = 0; i < 20; i++) {
      expect(repo.query({ clinicId: "clinic-1", limit: 100 }).entries.map((e) => e.auditId)).toEqual(first);
    }
    // Newest first, ties broken by descending auditId.
    expect(first).toEqual([...first].sort().reverse());
  });

  it("paginates without duplicates or gaps across page boundaries", () => {
    const repo = seeded(100);
    const seen: string[] = [];
    for (let page = 1; page <= 4; page++) {
      seen.push(...repo.query({ clinicId: "clinic-1", page, limit: 25 }).entries.map((e) => e.auditId));
    }
    expect(seen).toHaveLength(100);
    expect(new Set(seen).size).toBe(100);
  });

  it("returns range exports in ascending, reproducible order", () => {
    const repo = seeded(50);
    const a = repo.findAllInRange("clinic-1").map((e) => e.auditId);
    const b = repo.findAllInRange("clinic-1").map((e) => e.auditId);
    expect(a).toEqual(b);
    expect(a).toEqual([...a].sort());
  });

  it("cursor pages cover every entry exactly once", () => {
    const repo = seeded(60);
    const seen: string[] = [];
    let cursor: string | undefined;
    for (let i = 0; i < 10; i++) {
      const page = repo.queryPage({ clinicId: "clinic-1", limit: 25, cursor });
      seen.push(...page.items.map((e) => e.auditId));
      if (!page.nextCursor) break;
      cursor = page.nextCursor;
    }
    expect(seen).toHaveLength(60);
    expect(new Set(seen).size).toBe(60);
  });
});
