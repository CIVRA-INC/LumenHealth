import { describe, expect, it } from "vitest";
import { canonicalize, sha256Hash } from "../hashing.js";

describe("stellar-service hashing module (re-exported canonicalization)", () => {
  it("is stable across key insertion order", () => {
    expect(canonicalize({ a: 1, b: 2 })).toBe(canonicalize({ b: 2, a: 1 }));
  });

  it("treats undefined fields the same as missing fields", () => {
    expect(canonicalize({ a: 1, b: undefined })).toBe(canonicalize({ a: 1 }));
  });

  it("treats null as distinct from missing", () => {
    expect(canonicalize({ a: 1, b: null })).not.toBe(canonicalize({ a: 1 }));
  });

  it("sorts keys in nested objects regardless of depth", () => {
    const a = { outer: { z: 1, inner: { y: 1, x: 2 } } };
    const b = { outer: { inner: { x: 2, y: 1 }, z: 1 } };
    expect(canonicalize(a)).toBe(canonicalize(b));
  });

  it("produces a deterministic sha256 hex digest usable as a Stellar memo hash source", () => {
    const digest = sha256Hash({ auditId: "a-1", action: "staff.role_changed" });
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(sha256Hash({ auditId: "a-1", action: "staff.role_changed" })).toBe(digest);
  });

  it("produces a different digest for a semantically different payload", () => {
    const a = sha256Hash({ before: { role: "clinician" }, after: { role: "admin" } });
    const b = sha256Hash({ before: { role: "clinician" }, after: { role: "cashier" } });
    expect(a).not.toBe(b);
  });
});
