import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPublicRuntimeConfig } from "./public.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const read = (name: string, fallback?: string) => {
  const value = process.env[name]?.trim();
  if (value) {
    return value;
  }

  if (fallback !== undefined) {
    return fallback;
  }

  throw new Error(`[config] Missing required environment variable: ${name}`);
};

export const serverConfig = {
  apiPort: Number(read("API_PORT", "4000")),
  stellarNetwork: read("STELLAR_NETWORK", "testnet"),
  stellarHorizonUrl: read("STELLAR_HORIZON_URL", "https://horizon-testnet.stellar.org"),
  // Shared secret used to authenticate service-to-service calls (e.g.
  // apps/stellar-service pulling unanchored audit entries from apps/api).
  // Dev-only fallback — set INTERNAL_SERVICE_TOKEN in every real environment.
  internalServiceToken: read("INTERNAL_SERVICE_TOKEN", "dev-internal-token"),
  // Base URL apps/api uses to reach apps/stellar-service's internal HTTP API
  // (e.g. to fetch the on-chain Merkle root for an anchored batch).
  stellarServiceUrl: read("STELLAR_SERVICE_URL", "http://localhost:4100"),
  stellarServicePort: Number(read("STELLAR_SERVICE_PORT", "4100")),
  // Explicit CORS allowlist for the api (comma-separated). Defaults to the
  // local web dev origin; set CORS_ALLOWED_ORIGINS in every real environment.
  corsAllowedOrigins: read("CORS_ALLOWED_ORIGINS", "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  // App-wide rate limiting (per client IP) applied to all routers.
  rateLimitWindowMs: Number(read("RATE_LIMIT_WINDOW_MS", "60000")),
  rateLimitMax: Number(read("RATE_LIMIT_MAX", "600")),
  // How often the persistent anchoring job runs a batch, in ms. Default: 1 minute.
  anchorIntervalMs: Number(read("ANCHOR_INTERVAL_MS", "60000")),
  // Reconciliation treats the unanchored queue as stuck once its oldest
  // entry has been waiting this long, and forces an extra out-of-cycle
  // batch attempt. Default: 15 minutes.
  anchorReconcileStaleThresholdMs: Number(read("ANCHOR_RECONCILE_STALE_THRESHOLD_MS", "900000")),
  public: getPublicRuntimeConfig(),
};

// Auth-specific config — Closes #441
export const authConfig = {
  jwtSecret: read("JWT_SECRET"),
  accessTokenTtl: Number(read("JWT_ACCESS_TTL", "900")),
  refreshTokenTtl: Number(read("JWT_REFRESH_TTL", "604800")),
  bcryptRounds: Number(read("BCRYPT_ROUNDS", "12")),
};

export { getPublicRuntimeConfig } from "./public.js";
export { workspaceBoundaries, workspaceBoundarySummary } from "./workspace-boundaries.js";
