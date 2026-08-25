import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    env: {
      // @lumen/config requires these at import time; tests never talk to a
      // real Stellar account or issue real JWTs, so dummy values are fine.
      JWT_SECRET: "test-jwt-secret-do-not-use-in-production",
      INTERNAL_SERVICE_TOKEN: "test-internal-service-token",
    },
  },
});
