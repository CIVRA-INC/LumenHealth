import { Keypair, Networks } from "@stellar/stellar-sdk";
import { serverConfig } from "@lumen/config";

export type StellarNetworkConfig = {
  network: string;
  networkPassphrase: string;
  horizonUrl: string;
};

export function loadNetworkConfig(): StellarNetworkConfig {
  return {
    network: serverConfig.stellarNetwork,
    networkPassphrase:
      serverConfig.stellarNetwork === "mainnet" ? Networks.PUBLIC : Networks.TESTNET,
    horizonUrl: serverConfig.stellarHorizonUrl,
  };
}

/**
 * Loads the anchoring account's keypair from `STELLAR_ANCHOR_SECRET`.
 * Throws if the env var is missing or not a valid Stellar secret seed.
 * No transactions are signed with this yet — the loader exists so the
 * anchoring write path (a later issue) has a single, tested place to get
 * a keypair from.
 */
export function loadAnchorKeypair(): Keypair {
  const secret = process.env.STELLAR_ANCHOR_SECRET?.trim();
  if (!secret) {
    throw new Error("[stellar-service] Missing required environment variable: STELLAR_ANCHOR_SECRET");
  }
  return Keypair.fromSecret(secret);
}
