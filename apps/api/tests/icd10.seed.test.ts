import { describe, expect, it } from "vitest";
import { buildIcd10LiteDataset } from "../../scripts/seed-icd10-lite";

describe("buildIcd10LiteDataset", () => {
  it("generates 1000 deterministic codes", () => {
    const rows = buildIcd10LiteDataset(1000);
    expect(rows).toHaveLength(1000);
    expect(rows[0]).toMatchObject({ code: "A00.0" });

    const unique = new Set(rows.map((row) => row.code));
    expect(unique.size).toBe(1000);
  });
});
