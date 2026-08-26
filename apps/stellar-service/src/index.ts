import { loadNetworkConfig, loadAnchorMultisigSetup } from "./config.js";
import { StellarClient } from "./client.js";
import { AnchoringService } from "./anchoring.js";
import { fetchUnanchoredEntries, persistAnchorResult } from "./api-client.js";

export {
  loadNetworkConfig,
  loadAnchorAccountPublicKey,
  loadAnchorCosignerKeypairs,
  loadAnchorRequiredWeight,
  loadAnchorMultisigSetup,
  loadExportSigningKeypair,
  loadSigningKeyRegistry,
} from "./config.js";
export type { StellarNetworkConfig, AnchorMultisigSetup } from "./config.js";
export { StellarClient } from "./client.js";
export { canonicalize, sha256Hash, hashAuditEntry } from "./hashing.js";
export { buildMerkleTree, getMerkleProof, verifyMerkleProof } from "./merkle.js";
export type { MerkleTree } from "./merkle.js";
export { AnchoringService, MERKLE_ROOT_DATA_NAME } from "./anchoring.js";
export type {
  UnanchoredEntry,
  FetchUnanchoredEntries,
  PersistAnchorResult,
  AnchoringServiceOptions,
} from "./anchoring.js";
export { AnchoringScheduler } from "./scheduler.js";
export type { AnchoringSchedulerOptions, StaleUnanchoredInfo } from "./scheduler.js";
export { withRetry } from "./retry.js";
export type { RetryOptions } from "./retry.js";
export { collectSignatures, localCosigner, buildMultisigSetupOperations, InsufficientSignaturesError } from "./multisig.js";
export type { Cosigner } from "./multisig.js";
export { fetchUnanchoredEntries, persistAnchorResult } from "./api-client.js";
export { createInternalApp } from "./internal-app.js";
export type { GetMerkleRootForTx, SignPayload } from "./internal-app.js";
export { signPayload, verifyPayloadSignature } from "./signing.js";
export type { SignedPayload } from "./signing.js";
export { verifyExportBundle } from "./verify-export.js";
export type { ExportVerificationReport, ExportEntryResult } from "./verify-export.js";

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

/**
 * On-demand, one-shot batch anchor run, invoked via `npm run dev -- anchor`.
 * For continuous operation, use `npm run dev:scheduler` instead (see
 * `scheduler-main.ts`), which runs this same `AnchoringService` on an
 * interval with reconciliation rather than requiring a human to re-invoke it.
 */
async function runAnchorBatch() {
  const network = loadNetworkConfig();
  const client = new StellarClient(network);
  const { anchorAccountPublicKey, cosigners, requiredWeight } = loadAnchorMultisigSetup();
  const service = new AnchoringService(
    client,
    anchorAccountPublicKey,
    cosigners,
    requiredWeight,
    fetchUnanchoredEntries,
    persistAnchorResult,
  );

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
