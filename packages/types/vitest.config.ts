import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov", "json-summary"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/__tests__/**"],
      // Contract-critical hashing and Merkle code: a higher floor than the
      // apps. Set without measuring; adjust after the first CI report.
      thresholds: { lines: 60, functions: 60, branches: 50, statements: 60 },
    },
  },
});
