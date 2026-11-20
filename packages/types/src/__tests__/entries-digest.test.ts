import { describe, expect, it } from "vitest";
import { computeEntriesDigest, sha256Hash } from "../hashing.js";

const pair = (auditId: string) => ({ auditId, sha256Hash: `hash-of-${auditId}` });

describe("computeEntriesDigest", () => {
  it("sorts by code unit, not by locale collation", () => {
    // Under `tr`/`sv` collation these ids sort differently than by code unit ("I" vs "ı", "ä" vs "z").
    const ids = ["z-1", "ä-1", "I-1", "ı-1", "a-1", "A-1", "-b", "b"];
    const expectedOrder = [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

    expect(computeEntriesDigest(ids.map(pair))).toBe(sha256Hash(expectedOrder.map(pair)));
  });

  it("does not depend on input order", () => {
    const ids = ["c", "a", "b", "B", "Z"];
    expect(computeEntriesDigest(ids.map(pair))).toBe(computeEntriesDigest([...ids].reverse().map(pair)));
  });

  it("keeps the digest of lowercase UUID ids unchanged (existing bundles still verify)", () => {
    const ids = [
      "0b0e2a52-5f43-4a47-8c7e-6c3d0a3e5a11",
      "9f8e7d6c-1a2b-4c3d-8e9f-0a1b2c3d4e5f",
      "123e4567-e89b-42d3-a456-426614174000",
    ];
    // Expected value is built with plain `.sort()` on the strings, which is what localeCompare
    // produced for hex-and-dash lowercase ids.
    const legacy = [...ids].sort().map(pair);
    expect(computeEntriesDigest(ids.map(pair))).toBe(sha256Hash(legacy));
  });

  it("gives the same digest whatever LC_ALL is set to", () => {
    const entries = ["x", "É", "e", "ö", "o"].map(pair);
    const original = process.env.LC_ALL;
    try {
      const digests = ["C", "tr_TR.UTF-8", "sv_SE.UTF-8", "en_US.UTF-8"].map((locale) => {
        process.env.LC_ALL = locale;
        return computeEntriesDigest(entries);
      });
      expect(new Set(digests).size).toBe(1);
    } finally {
      if (original === undefined) delete process.env.LC_ALL;
      else process.env.LC_ALL = original;
    }
  });

  it("changes when an entry hash changes", () => {
    expect(computeEntriesDigest([pair("a")])).not.toBe(computeEntriesDigest([{ auditId: "a", sha256Hash: "other" }]));
  });
});
