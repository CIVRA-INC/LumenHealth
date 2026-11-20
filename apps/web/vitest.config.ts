import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@lumen/config/public": path.resolve(__dirname, "../../packages/config/public.ts"),
      "@lumen/config": path.resolve(__dirname, "../../packages/config/index.ts"),
      "@lumen/types": path.resolve(__dirname, "../../packages/types/src/index.ts"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov", "json-summary"],
      include: ["app/**/*.{ts,tsx}"],
      exclude: ["**/*.test.{ts,tsx}", "app/layout.tsx"],
      // Floor: set without measuring; ratchet after the first CI report.
      thresholds: { lines: 30, functions: 30, branches: 25, statements: 30 },
    },
    setupFiles: ["./vitest.setup.ts"],
  },
});
