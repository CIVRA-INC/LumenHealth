import { Horizon, Keypair } from "@stellar/stellar-sdk";
import { config } from "@lumen/config";

export interface WalletBalance {
  asset_type: string;
  balance: string;
}

export class PlatformWalletService {
  private server: Horizon.Server;
  private keypair: Keypair | null = null;

  constructor() {
    // 1. Connect to the network defined in our shared config
    this.server = new Horizon.Server(config.stellar.horizonUrl);

    // 2. Load the Platform Keys (Safe loading)
    if (config.stellar.platformSecretKey) {
      try {
        this.keypair = Keypair.fromSecret(config.stellar.platformSecretKey);
        // Security Log (Public Key ONLY)
        console.log(`🔐 Wallet Service Initialized for: ${this.keypair.publicKey()}`);
      } catch (error) {
        console.error("❌ Invalid Stellar Secret Key provided in .env");
      }
    } else {
      console.warn("⚠️ No Platform Wallet Secret Key found. Wallet features will be disabled.");
    }
  }

  /**
   * Fetches the full account details from the Stellar Network.
   * Useful for checking sequence numbers and all balances.
   */
  async getAccountDetails() {
    if (!this.keypair) {
      throw new Error("Wallet not configured. Cannot fetch details.");
    }

    try {
      const account = await this.server.loadAccount(this.keypair.publicKey());
      return account;
    } catch (error: any) {
      // Handle "Account Not Found" (Common on Testnet if not funded)
      if (error.response && error.response.status === 404) {
        throw new Error("Account not found on network. Please fund this wallet using the Friendbot.");
      }
      throw error;
    }
  }

  /**
   * Helper to get just the Native (XLM) balance.
   */
  async getNativeBalance(): Promise<string> {
    const account = await this.getAccountDetails();
    
    // Find the "native" (XLM) balance entry
    const native = account.balances.find((b) => b.asset_type === "native");
    return native ? native.balance : "0.0000000";
  }

  /**
   * Returns the Public Key (Safe to share)
   */
  getPublicKey(): string {
    return this.keypair ? this.keypair.publicKey() : "";
  }
}