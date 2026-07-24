import { Operation, TransactionBuilder, BASE_FEE } from "@stellar/stellar-sdk";
import type { Keypair, Horizon } from "@stellar/stellar-sdk";
import type { BatchAnchorResult } from "@lumen/types";
import type { StellarClient } from "./client.js";
import { buildMerkleTree, getMerkleProof } from "./merkle.js";

export type UnanchoredEntry = {
  auditId: string;
  sha256Hash: string;
};

export type FetchUnanchoredEntries = () => Promise<UnanchoredEntry[]>;
export type PersistAnchorResult = (result: BatchAnchorResult) => Promise<void>;

/** Stellar `manageData` entry names have a 64-byte limit; keep this stable. */
export const MERKLE_ROOT_DATA_NAME = "audit_merkle_root";

export class AnchoringService {
  constructor(
    private readonly client: StellarClient,
    private readonly keypair: Keypair,
    private readonly fetchUnanchoredEntries: FetchUnanchoredEntries,
    private readonly persistAnchorResult: PersistAnchorResult,
  ) {}

  /**
   * Pulls all currently unanchored audit entry hashes, builds a Merkle tree
   * over them, writes the root to Stellar via a single `manageData`
   * operation, and persists the resulting tx hash + each entry's inclusion
   * proof. Returns `null` if there was nothing to anchor.
   */
  async runBatch(): Promise<BatchAnchorResult | null> {
    const unanchored = await this.fetchUnanchoredEntries();
    if (unanchored.length === 0) {
      return null;
    }

    const tree = buildMerkleTree(unanchored.map((entry) => entry.sha256Hash));
    const response = await this.submitMerkleRoot(tree.root);
    const anchoredAt = new Date().toISOString();

    const result: BatchAnchorResult = {
      merkleRoot: tree.root,
      stellarTxHash: response.hash,
      anchoredAt,
      entries: unanchored.map((entry, index) => ({
        auditId: entry.auditId,
        merkleProof: getMerkleProof(tree, index),
      })),
    };

    await this.persistAnchorResult(result);
    return result;
  }

  private async submitMerkleRoot(
    merkleRoot: string,
  ): Promise<Horizon.HorizonApi.SubmitTransactionResponse> {
    const account = await this.client.loadAccount(this.keypair.publicKey());

    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.client.network.networkPassphrase,
    })
      .addOperation(
        Operation.manageData({
          name: MERKLE_ROOT_DATA_NAME,
          value: merkleRoot,
        }),
      )
      .setTimeout(30)
      .build();

    transaction.sign(this.keypair);

    return this.client.raw().submitTransaction(transaction);
  }
}
