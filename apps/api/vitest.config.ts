import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@qyou/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
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
