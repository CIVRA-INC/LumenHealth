import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { blindIndex, decryptField, encryptField, rewrapField, type KeyRing } from "./field-encryption.js";

const ring = (active: string, keys: Record<string, Buffer>): KeyRing => ({ activeKeyId: active, keys, blindIndexKey: Buffer.alloc(32, 7) });
const k1 = randomBytes(32);
const k2 = randomBytes(32);

describe("field encryption", () => {
  it("round-trips without leaving plaintext in the stored form", () => {
    const r = ring("k1", { k1 });
    const enc = encryptField("Owner@Example.com", r);
    expect(JSON.stringify(enc)).not.toContain("Example");
    expect(decryptField(enc, r)).toBe("Owner@Example.com");
  });

  it("supports equality lookups via a normalized blind index", () => {
    const r = ring("k1", { k1 });
    expect(blindIndex(" Owner@Example.com ", r)).toBe(blindIndex("owner@example.com", r));
    expect(blindIndex("a@x.com", r)).not.toBe(blindIndex("b@x.com", r));
  });

  it("rotates the key encryption key without re-encrypting data", () => {
    const old = encryptField("secret", ring("k1", { k1 }));
    const rotated = rewrapField(old, ring("k2", { k1, k2 }));
    expect(rotated.kid).toBe("k2");
    expect(rotated.ct).toBe(old.ct);
    expect(decryptField(rotated, ring("k2", { k2 }))).toBe("secret");
  });
});
