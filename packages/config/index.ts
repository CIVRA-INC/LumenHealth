import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPublicRuntimeConfig } from "./public";

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
  public: getPublicRuntimeConfig(),
};

export { getPublicRuntimeConfig } from "./public";
export { workspaceBoundaries, workspaceBoundarySummary } from "./workspace-boundaries";
