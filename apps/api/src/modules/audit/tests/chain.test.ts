import { describe, expect, it } from "vitest";
import { detectSequenceGaps, isCompleteRange } from "@lumen/types";

describe("chain utilities", () => {
  it("detects gaps between sequences", () => {
    expect(detectSequenceGaps([1, 2, 4, 5])).toEqual([3]);
    expect(detectSequenceGaps([1, 2, 3])).toEqual([]);
    expect(detectSequenceGaps([5])).toEqual([]);
  });

  it("isCompleteRange checks for contiguous coverage", () => {
    expect(isCompleteRange([1, 2, 4], 1, 4)).toBe(false);
    expect(isCompleteRange([1, 2, 3, 4], 1, 4)).toBe(true);
    expect(isCompleteRange([1, 2, 3], undefined, undefined)).toBe(true);
    expect(isCompleteRange([])).toBe(true);
  });
});
