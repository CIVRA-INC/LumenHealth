import { loadNetworkConfig, loadAnchorKeypair } from "./config.js";
import { StellarClient } from "./client.js";
import { AnchoringService } from "./anchoring.js";
import { fetchUnanchoredEntries, persistAnchorResult } from "./api-client.js";

export { loadNetworkConfig, loadAnchorKeypair } from "./config.js";
export type { StellarNetworkConfig } from "./config.js";
export { StellarClient } from "./client.js";
export { canonicalize, sha256Hash, hashAuditEntry } from "./hashing.js";
export { buildMerkleTree, getMerkleProof, verifyMerkleProof } from "./merkle.js";
export type { MerkleTree } from "./merkle.js";
export { AnchoringService, MERKLE_ROOT_DATA_NAME } from "./anchoring.js";
export type { UnanchoredEntry, FetchUnanchoredEntries, PersistAnchorResult } from "./anchoring.js";
export { fetchUnanchoredEntries, persistAnchorResult } from "./api-client.js";

async function runDiagnostics() {
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

/** On-demand batch anchor run, invoked via `npm run dev -- anchor`. */
async function runAnchorBatch() {
  const network = loadNetworkConfig();
  const client = new StellarClient(network);
  const keypair = loadAnchorKeypair();
  const service = new AnchoringService(client, keypair, fetchUnanchoredEntries, persistAnchorResult);

  const result = await service.runBatch();
  if (!result) {
    console.log("No unanchored audit entries to batch.");
    return;
  }

  console.log(`Anchored ${result.entries.length} entries in tx ${result.stellarTxHash}`);
  console.log(`Merkle root: ${result.merkleRoot}`);
}

async function main() {
  if (process.argv.includes("anchor")) {
    await runAnchorBatch();
  } else {
    await runDiagnostics();
  }
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
