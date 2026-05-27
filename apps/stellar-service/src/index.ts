import { Horizon, Networks } from "@stellar/stellar-sdk";
import { serverConfig } from "@lumen/config";

const networkPassphrase =
  serverConfig.stellarNetwork === "mainnet" ? Networks.PUBLIC : Networks.TESTNET;

const server = new Horizon.Server(serverConfig.stellarHorizonUrl);

async function main() {
  console.log("LumenHealth Stellar service starter");
  console.log(`Network: ${serverConfig.stellarNetwork}`);
  console.log(`Passphrase: ${networkPassphrase}`);

  try {
    await server.feeStats();
    console.log("Horizon diagnostics reachable");
  } catch (error) {
    console.error("Unable to reach Horizon diagnostics");
    console.error(error);
  }
}

void main();
