import { serverConfig } from "@lumen/config";
import { loadNetworkConfig, loadAnchorKeypair } from "./config.js";
import { StellarClient } from "./client.js";
import { AnchoringService } from "./anchoring.js";
import { AnchoringScheduler } from "./scheduler.js";
import { fetchUnanchoredEntries, persistAnchorResult } from "./api-client.js";

/**
 * Persistent entrypoint for the anchoring job — the production replacement
 * for manually running `npm run dev -- anchor`. Runs a batch anchor on a
 * fixed interval and periodically reconciles a stuck unanchored queue,
 * logging failures instead of letting an unhandled rejection kill the
 * process.
 */
function main() {
  const network = loadNetworkConfig();
  const client = new StellarClient(network);
  const keypair = loadAnchorKeypair();

  const anchoringService = new AnchoringService(client, keypair, fetchUnanchoredEntries, persistAnchorResult);

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
  });

  console.log(
    `[anchoring] starting scheduler: interval=${serverConfig.anchorIntervalMs}ms, ` +
      `staleThreshold=${serverConfig.anchorReconcileStaleThresholdMs}ms, network=${network.network}`,
  );
  scheduler.start();

  process.on("SIGTERM", () => {
    console.log("[anchoring] received SIGTERM, stopping scheduler");
    scheduler.stop();
    process.exit(0);
  });
  process.on("SIGINT", () => {
    console.log("[anchoring] received SIGINT, stopping scheduler");
    scheduler.stop();
    process.exit(0);
  });
}

main();
