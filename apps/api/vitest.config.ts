import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
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
