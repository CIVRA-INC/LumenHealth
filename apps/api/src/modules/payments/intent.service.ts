import { config } from "@lumen/config";
import crypto from "crypto";

export interface PaymentIntent {
  intentId: string;       // Internal System ID (UUID)
  destination: string;    // The Platform's Wallet Address
  amount: string;         // Amount to pay (e.g., "100")
  asset: string;          // "XLM" or "USDC"
  memo: string;           // The unique locking mechanism (Hash)
  memoType: "hash";       // Stellar requires us to specify the type
  expiresAt: Date;        // When this quote expires
}

export class PaymentIntentService {
  /**
   * Generates a payment instruction for a clinic.
   * This does NOT charge them yet; it just creates the "invoice".
   */
  static createIntent(clinicId: string, amount: string): PaymentIntent {
    if (!config.stellar.platformPublicKey) {
      throw new Error("❌ Platform Wallet not configured. Cannot accept payments.");
    }

    // 1. Generate a unique reference ID for our system
    const intentId = crypto.randomUUID();

    // 2. Create a deterministic Memo Hash from the Intent ID
    // We strip the hyphens from the UUID to make it cleaner, 
    // or just hash the UUID to ensure it fits perfectly in 32 bytes.
    const memoHash = crypto
      .createHash("sha256")
      .update(intentId + clinicId) // Bind it to the clinic for extra safety
      .digest("hex");

    // 3. Set Expiry (e.g., 60 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 60);

    return {
      intentId,
      destination: config.stellar.platformPublicKey,
      amount,
      asset: "native", // Default to XLM (Lumens)
      memo: memoHash,
      memoType: "hash",
      expiresAt,
    };
  }
}