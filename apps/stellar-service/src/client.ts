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

  /** Escape hatch for calls not yet wrapped by this client. */
  raw(): Horizon.Server {
    return this.server;
  }
}
