import { loadNetworkConfig } from "./config.js";
import { StellarClient } from "./client.js";

export { loadNetworkConfig, loadAnchorKeypair } from "./config.js";
export type { StellarNetworkConfig } from "./config.js";
export { StellarClient } from "./client.js";
export { canonicalize, sha256Hash, hashAuditEntry } from "./hashing.js";

async function main() {
  const network = loadNetworkConfig();
  const client = new StellarClient(network);

  console.log("LumenHealth Stellar service starter");
  console.log(`Network: ${network.network}`);
  console.log(`Passphrase: ${network.networkPassphrase}`);

  const healthy = await client.isHealthy();
  if (healthy) {
    console.log("Horizon diagnostics reachable");
  } else {
    console.error("Unable to reach Horizon diagnostics");
  }
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
