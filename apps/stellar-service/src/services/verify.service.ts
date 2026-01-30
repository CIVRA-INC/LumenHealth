import { Horizon } from "@stellar/stellar-sdk";
import { config } from "@lumen/config";

export interface VerificationResult {
  isValid: boolean;
  timestamp?: string; // When it happened on-chain
  error?: string;     // Why it failed
}

export class TransactionVerificationService {
  private server: Horizon.Server;

  constructor() {
    this.server = new Horizon.Server(config.stellar.horizonUrl);
  }

  /**
   * Verifies a specific transaction hash against our expectations.
   */
  async verifyPayment(
    txHash: string,
    expectedAmount: string,
    expectedMemo: string // We expect the Hex Hash we generated earlier
  ): Promise<VerificationResult> {
    try {
      // 1. Fetch the Transaction
      const tx = await this.server.transactions().transaction(txHash).call();

      // 2. Check Success Status
      if (!tx.successful) {
        return { isValid: false, error: "Transaction failed on the Stellar Network." };
      }

      // 3. Verify Memo
      // Stellar returns Hash memos as Base64. We need to convert our expected Hex to Base64 to compare,
      // OR convert the Stellar Base64 back to Hex. Let's do Base64 -> Hex.
      const txMemoType = tx.memo_type;
      let txMemoValue = tx.memo;

      if (txMemoType === "hash") {
         // Convert Base64 response to Hex for comparison
         const buffer = Buffer.from(txMemoValue as string, "base64");
         txMemoValue = buffer.toString("hex");
      }

      if (txMemoValue !== expectedMemo) {
        return { 
          isValid: false, 
          error: `Memo mismatch. Expected ${expectedMemo}, got ${txMemoValue}` 
        };
      }

      // 4. Verify Payment Operation
      // A transaction can contain many unrelated ops. We need to find the specific payment to US.
      const operations = await tx.operations();
      
      const paymentOp = operations.records.find((op) => {
        return (
          op.type === "payment" &&
          op.to === config.stellar.platformPublicKey && // Must be sent to OUR wallet
          op.asset_type === "native" &&                 // Must be XLM (for this MVP)
          parseFloat(op.amount) >= parseFloat(expectedAmount) // Allow overpayment, reject underpayment
        );
      });

      if (!paymentOp) {
        return { 
          isValid: false, 
          error: "No valid payment operation found to platform wallet with correct amount." 
        };
      }

      return {
        isValid: true,
        timestamp: tx.created_at,
      };

    } catch (error: any) {
      console.error("Verification Error:", error.message);
      // Handle "Resource Missing" (404) specifically
      if (error.response?.status === 404) {
        return { isValid: false, error: "Transaction hash not found on network." };
      }
      return { isValid: false, error: error.message };
    }
  }
}