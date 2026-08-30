import { describe, expect, it } from "vitest";
import {
  canonicalize,
  sha256Hash,
  hashAuditEntry,
  CanonicalizeLimitError,
  CANONICALIZE_MAX_DEPTH,
  CANONICALIZE_MAX_NODES,
} from "../hashing.js";
import type { HashableAuditEntry } from "../audit.js";

describe("canonicalize", () => {
  it("produces the same output regardless of key insertion order", () => {
    const a = { b: 1, a: 2, c: 3 };
    const b = { c: 3, a: 2, b: 1 };
    expect(canonicalize(a)).toBe(canonicalize(b));
  });

  it("treats an explicit undefined field the same as a missing field", () => {
    const withUndefined = { a: 1, b: undefined };
    const missing = { a: 1 };
    expect(canonicalize(withUndefined)).toBe(canonicalize(missing));
  });

  it("preserves null as distinct from undefined/missing", () => {
    const withNull = { a: 1, b: null };
    const missing = { a: 1 };
    expect(canonicalize(withNull)).not.toBe(canonicalize(missing));
  });

  it("sorts keys recursively in nested objects", () => {
    const a = { outer: { z: 1, y: { n: 2, m: 3 } } };
    const b = { outer: { y: { m: 3, n: 2 }, z: 1 } };
    expect(canonicalize(a)).toBe(canonicalize(b));
  });

  it("preserves array element order", () => {
    const a = { list: [1, 2, 3] };
    const b = { list: [3, 2, 1] };
    expect(canonicalize(a)).not.toBe(canonicalize(b));
  });

  it("distinguishes objects that differ only in one field's value", () => {
    const a = { x: 1 };
    const b = { x: 2 };
    expect(canonicalize(a)).not.toBe(canonicalize(b));
  });

  it("rejects input nested deeper than the depth limit (issue #1027)", () => {
    let deep: Record<string, unknown> = { leaf: 1 };
    for (let i = 0; i < CANONICALIZE_MAX_DEPTH + 5; i++) {
      deep = { nested: deep };
    }
    expect(() => canonicalize(deep)).toThrow(CanonicalizeLimitError);
  });

  it("rejects input with more nodes than the size limit (issue #1027)", () => {
    const huge = Array.from({ length: CANONICALIZE_MAX_NODES + 10 }, (_, i) => i);
    expect(() => canonicalize(huge)).toThrow(CanonicalizeLimitError);
  });

  it("still canonicalizes normal, bounded audit payloads", () => {
    expect(() => canonicalize({ before: { role: "clinician" }, after: { role: "admin" } })).not.toThrow();
  });
});

describe("sha256Hash", () => {
  it("is deterministic for semantically identical values", () => {
    const a = { role: "clinician", changedAt: "2026-01-01T00:00:00.000Z", note: undefined };
    const b = { changedAt: "2026-01-01T00:00:00.000Z", role: "clinician" };
    expect(sha256Hash(a)).toBe(sha256Hash(b));
  });

  it("changes when any field value changes", () => {
    const before = { role: "clinician" };
    const after = { role: "admin" };
    expect(sha256Hash(before)).not.toBe(sha256Hash(after));
  });

  it("returns a 64-character hex digest", () => {
    const digest = sha256Hash({ a: 1 });
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("hashAuditEntry", () => {
  const base: HashableAuditEntry = {
    auditId: "a-1",
    clinicId: "c-1",
    action: "staff.role_changed",
    actorId: "u-1",
    actorRole: "owner",
    targetId: "u-2",
    targetType: "staff",
    before: { role: "clinician" },
    after: { role: "admin" },
    createdAt: "2026-01-01T00:00:00.000Z",
  };

  it("is stable across two semantically identical entries", () => {
    const clone: HashableAuditEntry = JSON.parse(JSON.stringify(base));
    expect(hashAuditEntry(base)).toBe(hashAuditEntry(clone));
  });

  it("is unaffected by explicit undefined optional fields", () => {
    const withExplicitUndefined: HashableAuditEntry = {
      ...base,
      ipAddress: undefined,
      userAgent: undefined,
    };
    expect(hashAuditEntry(base)).toBe(hashAuditEntry(withExplicitUndefined));
  });

  it("changes when the `before` field changes", () => {
    const tampered: HashableAuditEntry = { ...base, before: { role: "admin" } };
    expect(hashAuditEntry(base)).not.toBe(hashAuditEntry(tampered));
  });

  it("changes when the `after` field changes", () => {
    const tampered: HashableAuditEntry = { ...base, after: { role: "cashier" } };
    expect(hashAuditEntry(base)).not.toBe(hashAuditEntry(tampered));
  });

  it("changes when any top-level field changes", () => {
    const tampered: HashableAuditEntry = { ...base, actorId: "u-999" };
    expect(hashAuditEntry(base)).not.toBe(hashAuditEntry(tampered));
  });
});
