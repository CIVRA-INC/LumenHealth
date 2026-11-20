export interface Eniolaagoro7CoverageThresholds {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
}

export const eniolaagoro7VitestCoverageConfig = {
  test: {
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
    coverage: {
      provider: "v8" as const,
      reporter: ["text", "html", "lcov"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      } satisfies Eniolaagoro7CoverageThresholds,
    },
  },
};

export function meetsEniolaagoro7CoverageThresholds(actual: Partial<Eniolaagoro7CoverageThresholds>): boolean {
  const t = eniolaagoro7VitestCoverageConfig.test.coverage.thresholds;
  return (actual.lines ?? 0) >= t.lines
    && (actual.functions ?? 0) >= t.functions
    && (actual.branches ?? 0) >= t.branches
    && (actual.statements ?? 0) >= t.statements;
}
