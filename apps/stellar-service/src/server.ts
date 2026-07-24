import { serverConfig } from "@lumen/config";
import { loadNetworkConfig } from "./config.js";
import { StellarClient } from "./client.js";
import { MERKLE_ROOT_DATA_NAME } from "./anchoring.js";
import { createInternalApp } from "./internal-app.js";

const network = loadNetworkConfig();
const client = new StellarClient(network);

const app = createInternalApp((txHash) => client.getManageDataValue(txHash, MERKLE_ROOT_DATA_NAME));

app.listen(serverConfig.stellarServicePort, () => {
  console.log(`stellar-service internal API listening on :${serverConfig.stellarServicePort}`);
});
