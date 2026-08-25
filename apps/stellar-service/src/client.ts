import { Horizon } from "@stellar/stellar-sdk";
import type { StellarNetworkConfig } from "./config.js";

/**
 * Thin, typed wrapper around `Horizon.Server`. Keeps the raw SDK client out
 * of the rest of the codebase so call sites depend on a narrow, testable
 * surface instead of the full Horizon API.
 */
export class StellarClient {
  private readonly server: Horizon.Server;
  readonly network: StellarNetworkConfig;

  constructor(network: StellarNetworkConfig) {
    this.network = network;
    this.server = new Horizon.Server(network.horizonUrl);
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.server.feeStats();
      return true;
    } catch {
      return false;
    }
  }

  async loadAccount(publicKey: string): Promise<Horizon.AccountResponse> {
    return this.server.loadAccount(publicKey);
  }

  /**
   * Looks up the value of a `manageData` operation named `dataName` within
   * transaction `txHash`. Returns `null` if the transaction has no such
   * operation (or doesn't exist). Values are decoded back to the UTF-8
   * string that was originally written (Stellar stores them as raw bytes,
   * base64-encoded over the wire).
   */
  async getManageDataValue(txHash: string, dataName: string): Promise<string | null> {
    const page = await this.server.operations().forTransaction(txHash).call();

    for (const operation of page.records) {
      if (operation.type === "manage_data" && operation.name === dataName) {
        const raw = operation.value;
        return raw ? raw.toString("utf8") : null;
      }
    }

    return null;
  }

  /** Escape hatch for calls not yet wrapped by this client. */
  raw(): Horizon.Server {
    return this.server;
  }
}
