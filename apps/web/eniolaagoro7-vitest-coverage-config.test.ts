import { describe, expect, it } from "vitest";
import { eniolaagoro7VitestCoverageConfig, meetsEniolaagoro7CoverageThresholds } from "./eniolaagoro7-vitest-coverage-config";

describe("eniolaagoro7 vitest coverage config", () => {
  it("enables mock restoration and defines coverage thresholds", () => {
    expect(eniolaagoro7VitestCoverageConfig.test.restoreMocks).toBe(true);
    expect(eniolaagoro7VitestCoverageConfig.test.clearMocks).toBe(true);
    expect(eniolaagoro7VitestCoverageConfig.test.coverage.thresholds.lines).toBeGreaterThanOrEqual(80);
  });

  it("evaluates whether coverage meets thresholds", () => {
    expect(meetsEniolaagoro7CoverageThresholds({ lines: 90, functions: 90, branches: 80, statements: 90 })).toBe(true);
    expect(meetsEniolaagoro7CoverageThresholds({ lines: 70, functions: 90, branches: 80, statements: 90 })).toBe(false);
  });
});
