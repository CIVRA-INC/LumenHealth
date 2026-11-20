import path from "node:path";
import type { NextConfig } from "next";

// Next.js only reads `.env*` files from apps/web. Load the repo-root `.env` too
// (existing variables win), so NEXT_PUBLIC_* values set there reach the build.
try {
  process.loadEnvFile(path.resolve(process.cwd(), "../../.env"));
} catch {
  // no root .env — nothing to load
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@lumen/config", "@lumen/types"],
};

export default nextConfig;
