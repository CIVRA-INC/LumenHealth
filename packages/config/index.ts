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

/**
 * Parses `INTERNAL_SERVICE_SECRETS` — comma-separated `keyId:secret` pairs —
 * into the active-secret list used for signed service-to-service requests
 * (#1345). The first entry signs outgoing requests; every entry is accepted
 * on verification so secrets can be rotated one at a time.
 */
function parseInternalServiceSecrets(raw: string): { keyId: string; secret: string }[] {
  const secrets = raw
    .split(",")
    .map((pair) => pair.trim())
    .filter((pair) => pair.length > 0)
    .map((pair) => {
      const separator = pair.indexOf(":");
      if (separator <= 0 || separator === pair.length - 1) {
        throw new Error(
          "[config] INTERNAL_SERVICE_SECRETS entries must be `keyId:secret` pairs",
        );
      }
      return { keyId: pair.slice(0, separator), secret: pair.slice(separator + 1) };
    });

  if (secrets.length === 0) {
    throw new Error("[config] INTERNAL_SERVICE_SECRETS must contain at least one secret");
  }

  return secrets;
}

export const serverConfig = {
  apiPort: Number(read("API_PORT", "4000")),
  stellarNetwork: read("STELLAR_NETWORK", "testnet"),
  stellarHorizonUrl: read("STELLAR_HORIZON_URL", "https://horizon-testnet.stellar.org"),
  // @deprecated Static service-to-service token, replaced by the signed
  // requests configured via `internalServiceSecrets` below (#1345). No
  // longer consulted for authentication anywhere; kept only as a config
  // surface so environments that still set INTERNAL_SERVICE_TOKEN load.
  internalServiceToken: read("INTERNAL_SERVICE_TOKEN", "dev-internal-token"),
  // Active HMAC secrets for signed service-to-service requests (#1345).
  // `INTERNAL_SERVICE_SECRETS` is a comma-separated list of `keyId:secret`
  // pairs; the first entry signs outgoing requests, and all entries are
  // accepted on verification — so a new secret can be added ahead of a
  // rotation, and the old one removed afterwards, with no coordinated
  // restart. Dev-only fallback below.
  internalServiceSecrets: parseInternalServiceSecrets(
    read("INTERNAL_SERVICE_SECRETS", "dev-key:dev-internal-secret"),
  ),
  // Base URL apps/api uses to reach apps/stellar-service's internal HTTP API
  // (e.g. to fetch the on-chain Merkle root for an anchored batch).
  stellarServiceUrl: read("STELLAR_SERVICE_URL", "http://localhost:4100"),
  stellarServicePort: Number(read("STELLAR_SERVICE_PORT", "4100")),
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
