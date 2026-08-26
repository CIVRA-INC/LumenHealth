import { serverConfig } from "@lumen/config";
import { loadNetworkConfig, loadAnchorKeypair } from "./config.js";
import { StellarClient } from "./client.js";
import { AnchoringService, MERKLE_ROOT_DATA_NAME } from "./anchoring.js";
import { fetchUnanchoredEntries, persistAnchorResult } from "./api-client.js";
import { createInternalApp } from "./internal-app.js";
import { signPayload } from "./signing.js";

const network = loadNetworkConfig();
const client = new StellarClient(network);
const anchorKeypair = loadAnchorKeypair();

// Used only for anchorImmediate() here — the routine batch loop runs in its
// own process (see scheduler-main.ts) with its own AnchoringService
// instance. Both submit against the same Stellar account, which can race;
// that's addressed separately (see docs on transaction sequencing).
const anchoringService = new AnchoringService(client, anchorKeypair, fetchUnanchoredEntries, persistAnchorResult);

const app = createInternalApp(
  (txHash) => client.getManageDataValue(txHash, MERKLE_ROOT_DATA_NAME),
  (payload) => signPayload(anchorKeypair, payload),
  (entries) => anchoringService.anchorImmediate(entries),
);

app.listen(serverConfig.stellarServicePort, () => {
  console.log(`stellar-service internal API listening on :${serverConfig.stellarServicePort}`);
});
