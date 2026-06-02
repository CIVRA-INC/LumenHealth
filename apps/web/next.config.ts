import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@lumen/config", "@lumen/types"],
};

export default nextConfig;
