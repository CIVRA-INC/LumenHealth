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
    setupFiles: ["./vitest.setup.ts"],
  },
});
