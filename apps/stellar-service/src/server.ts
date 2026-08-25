import { serverConfig } from "@lumen/config";
import { loadNetworkConfig, loadExportSigningKeypair, loadSigningKeyRegistry } from "./config.js";
import { StellarClient } from "./client.js";
import { MERKLE_ROOT_DATA_NAME } from "./anchoring.js";
import { createInternalApp } from "./internal-app.js";
import { signPayload } from "./signing.js";

const network = loadNetworkConfig();
const client = new StellarClient(network);
// Deliberately not an anchor cosigner key — see loadExportSigningKeypair.
const exportSigningKeypair = loadExportSigningKeypair();
const signingKeyRegistry = loadSigningKeyRegistry();

const app = createInternalApp(
  (txHash) => client.getManageDataValue(txHash, MERKLE_ROOT_DATA_NAME),
  (payload) => signPayload(exportSigningKeypair, payload),
  signingKeyRegistry,
);

app.listen(serverConfig.stellarServicePort, () => {
  console.log(`stellar-service internal API listening on :${serverConfig.stellarServicePort}`);
});
