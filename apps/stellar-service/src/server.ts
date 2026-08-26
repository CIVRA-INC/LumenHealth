import { serverConfig } from "@lumen/config";
import {
  loadNetworkConfig,
  loadAnchorMultisigSetup,
  loadExportSigningKeypair,
  loadSigningKeyRegistry,
} from "./config.js";
import { StellarClient } from "./client.js";
import { AnchoringService, MERKLE_ROOT_DATA_NAME } from "./anchoring.js";
import { AnchoringScheduler } from "./scheduler.js";
import { fetchUnanchoredEntries, persistAnchorResult } from "./api-client.js";
import { createInternalApp } from "./internal-app.js";
import { signPayload } from "./signing.js";

/**
 * The persistent stellar-service process: serves the internal HTTP API
 * (merkle-root lookups, export-manifest signing, export verification,
 * immediate anchoring, and anchoring health) *and* runs the routine
 * anchoring scheduler, sharing one `AnchoringService` instance.
 *
 * These used to be split across separate concerns — a scheduler-only
 * entrypoint and an API-only one — but the health endpoint needs to read
 * the scheduler's live in-memory tick history, which only exists inside
 * whichever process runs it, and the immediate-anchor path needs to submit
 * against the same account as the routine batch job without racing it
 * (see docs/stellar-anchoring-concurrency.md — AnchoringService's
 * submission queue only serializes calls made on the *same* instance).
 * Running both in one process against one instance is what makes both of
 * those true.
 */
const network = loadNetworkConfig();
const client = new StellarClient(network);
const { anchorAccountPublicKey, cosigners, requiredWeight } = loadAnchorMultisigSetup();
// Deliberately not an anchor cosigner key — see loadExportSigningKeypair.
const exportSigningKeypair = loadExportSigningKeypair();
const signingKeyRegistry = loadSigningKeyRegistry();

const anchoringService = new AnchoringService(
  client,
  anchorAccountPublicKey,
  cosigners,
  requiredWeight,
  fetchUnanchoredEntries,
  persistAnchorResult,
);

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
  (payload) => signPayload(exportSigningKeypair, payload),
  (entries) => anchoringService.anchorImmediate(entries),
  () => scheduler.getHealth(),
  signingKeyRegistry,
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
