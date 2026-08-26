import { serverConfig } from "@lumen/config";
import { loadNetworkConfig, loadAnchorKeypair } from "./config.js";
import { StellarClient } from "./client.js";
import { AnchoringService, MERKLE_ROOT_DATA_NAME } from "./anchoring.js";
import { AnchoringScheduler } from "./scheduler.js";
import { fetchUnanchoredEntries, persistAnchorResult } from "./api-client.js";
import { createInternalApp } from "./internal-app.js";
import { signPayload } from "./signing.js";

/**
 * The persistent stellar-service process: serves the internal HTTP API
 * (merkle-root lookups, export-manifest signing, export verification, and
 * anchoring health) *and* runs the anchoring scheduler in the same process.
 *
 * These used to be two separate entrypoints (this file, plus a standalone
 * `scheduler-main.ts`) — merged here because the health endpoint needs to
 * read the scheduler's live in-memory tick history (last success, streak of
 * failures), which only exists inside whichever process actually runs it.
 * Splitting them back apart would mean the health endpoint could only ever
 * report on a scheduler it can't see.
 */
const network = loadNetworkConfig();
const client = new StellarClient(network);
const anchorKeypair = loadAnchorKeypair();

const anchoringService = new AnchoringService(client, anchorKeypair, fetchUnanchoredEntries, persistAnchorResult);

const scheduler = new AnchoringScheduler(anchoringService, fetchUnanchoredEntries, {
  intervalMs: serverConfig.anchorIntervalMs,
  reconcileStaleThresholdMs: serverConfig.anchorReconcileStaleThresholdMs,
  onBatchError: (error) => {
    console.error("[anchoring] batch attempt failed:", error);
  },
  onReconcileStale: ({ count, oldestAgeMs }) => {
    console.warn(
      `[anchoring] reconciliation: ${count} entries unanchored, oldest waiting ${Math.round(
        oldestAgeMs / 1000,
      )}s — forcing an extra batch attempt`,
    );
  },
  onConsecutiveFailures: (count) => {
    console.error(`[anchoring][ALERT] ${count} consecutive batch failures — anchoring pipeline is degraded`);
  },
});

const app = createInternalApp(
  (txHash) => client.getManageDataValue(txHash, MERKLE_ROOT_DATA_NAME),
  (payload) => signPayload(anchorKeypair, payload),
  () => scheduler.getHealth(),
);

app.listen(serverConfig.stellarServicePort, () => {
  console.log(`stellar-service internal API listening on :${serverConfig.stellarServicePort}`);
});

console.log(
  `[anchoring] starting scheduler: interval=${serverConfig.anchorIntervalMs}ms, ` +
    `staleThreshold=${serverConfig.anchorReconcileStaleThresholdMs}ms, network=${network.network}`,
);
scheduler.start();

function shutdown(signal: string): void {
  console.log(`[stellar-service] received ${signal}, stopping scheduler`);
  scheduler.stop();
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
