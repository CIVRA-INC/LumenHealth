import { Horizon } from "@stellar/stellar-sdk";
import { config } from "@lumen/config";

export interface StellarVerificationInput {
  txHash?: string;
  expectedMemo: string;
  expectedAmount: string;
}

export interface StellarVerificationResult {
  isVerified: boolean;
}

export class StellarService {
  private readonly server: Horizon.Server;

  constructor() {
    this.server = new Horizon.Server(config.stellar.horizonUrl);
  }

  private memoMatchesExpected(
    memoType: string,
    memoValue: string | undefined,
    expectedMemo: string,
  ): boolean {
    if (!memoValue) {
      return false;
    }

    if (memoType === "hash") {
      const hexMemo = Buffer.from(memoValue, "base64").toString("hex");
      return hexMemo === expectedMemo;
    }

    return memoValue === expectedMemo;
  }

  async verifyPaymentOnChain(
    input: StellarVerificationInput,
  ): Promise<StellarVerificationResult> {
    if (input.txHash) {
      const tx = await this.server.transactions().transaction(input.txHash).call();
      if (!tx.successful) {
        return { isVerified: false };
      }

      const memoMatches = this.memoMatchesExpected(tx.memo_type, tx.memo, input.expectedMemo);
      if (!memoMatches) {
        return { isVerified: false };
      }

      const operations = await tx.operations();
      const payment = operations.records.find(
        (op) =>
          op.type === "payment" &&
          op.asset_type === "native" &&
          parseFloat(op.amount) >= parseFloat(input.expectedAmount),
      );

      return { isVerified: Boolean(payment) };
    }

    const platformPublicKey = config.stellar.platformPublicKey;
    if (!platformPublicKey) {
      return { isVerified: false };
    }

    const transactions = await this.server
      .transactions()
      .forAccount(platformPublicKey)
      .order("desc")
      .limit(25)
      .call();

    const matched = transactions.records.find((tx) => {
      if (!tx.successful) {
        return false;
      }

      return this.memoMatchesExpected(tx.memo_type, tx.memo, input.expectedMemo);
    });

    if (!matched) {
      return { isVerified: false };
    }

    const operations = await matched.operations();
    const payment = operations.records.find(
      (op) =>
        op.type === "payment" &&
        op.asset_type === "native" &&
        parseFloat(op.amount) >= parseFloat(input.expectedAmount),
    );

    return { isVerified: Boolean(payment) };
  }
}
