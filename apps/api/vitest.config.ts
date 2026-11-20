import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov", "json-summary"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/main.ts"],
      // Floor: set without measuring (nothing was run); raise it to a few
      // points below the first CI report. See CONTRIBUTING.md "Coverage".
      thresholds: { lines: 30, functions: 30, branches: 25, statements: 30 },
    },
    env: {
      // @lumen/config and token.service require these at import time; tests
      // never talk to a real Stellar account or issue real JWTs, so dummy
      // values are fine (the access-token key must satisfy the strength
      // check in token.service: >= 32 chars, not a known default).
      JWT_SECRET: "test-jwt-secret-do-not-use-in-production",
      AUTH_ACCESS_TOKEN_KEY: "vitest-access-token-key-do-not-use-in-production-0000",
      INTERNAL_SERVICE_TOKEN: "test-internal-service-token",
    },
  },
});
