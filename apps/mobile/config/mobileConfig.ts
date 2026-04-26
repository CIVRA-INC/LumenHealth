/**
 * CHORD-072 – Mobile configuration and secret loading strategy.
 * Reads runtime env from Expo's extra config (app.config.ts) and falls back
 * to build-time constants. Secrets (tokens, keys) are never stored in JS
 * bundles – callers must supply them from SecureStore at runtime.
 */
import Constants from "expo-constants";

export type StellarNetwork = "testnet" | "mainnet";

export interface MobileConfig {
  apiBaseUrl: string;
  socketUrl: string;
  stellarNetwork: StellarNetwork;
  analyticsEnabled: boolean;
  logLevel: "debug" | "info" | "warn" | "error";
}

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<MobileConfig>;

function requireEnv(key: keyof MobileConfig, fallback?: string): string {
  const val = extra[key] as string | undefined;
  if (val) return val;
  if (fallback !== undefined) return fallback;
  throw new Error(`[config] Missing required config key: ${key}`);
}

export const mobileConfig: MobileConfig = {
  apiBaseUrl: requireEnv("apiBaseUrl", "http://localhost:4000/api/v1"),
  socketUrl: requireEnv("socketUrl", "http://localhost:4000"),
  stellarNetwork: (extra.stellarNetwork ?? "testnet") as StellarNetwork,
  analyticsEnabled: extra.analyticsEnabled ?? false,
  logLevel: (extra.logLevel ?? "info") as MobileConfig["logLevel"],
};

/** Validate config at startup – call once in App entry point. */
export function assertMobileConfig(): void {
  const { apiBaseUrl, socketUrl, stellarNetwork } = mobileConfig;
  if (!apiBaseUrl.startsWith("http")) throw new Error("[config] apiBaseUrl must be an HTTP URL");
  if (!socketUrl.startsWith("http")) throw new Error("[config] socketUrl must be an HTTP URL");
  if (!["testnet", "mainnet"].includes(stellarNetwork)) {
    throw new Error(`[config] Unknown stellarNetwork: ${stellarNetwork}`);
  }
}

export default mobileConfig;
