import { Operation, TransactionBuilder, BASE_FEE } from "@stellar/stellar-sdk";
import type { Keypair, Horizon } from "@stellar/stellar-sdk";
import type { StellarClient } from "./client.js";
import { buildMerkleTree, getMerkleProof, verifyMerkleProof } from "./merkle.js";
import { sha256Hash } from "./hashing.js";

export const DEMOGRAPHICS_MERKLE_ROOT_DATA_NAME = "demographics_merkle_root";

export type DemographicsAnchorEntry = {
  patientId: string;
  demographicsHash: string;
};

export type DemographicsAnchorResult = {
  merkleRoot: string;
  stellarTxHash: string;
  anchoredAt: string;
  entries: Array<{
    patientId: string;
    merkleProof: Array<{ hash: string; position: "left" | "right" }>;
  }>;
};

export class PatientDemographicsAnchorService {
  constructor(
    private readonly client: StellarClient,
    private readonly keypair: Keypair,
  ) {}

  async anchorDemographics(
    patientId: string,
    demographicsHash: string,
  ): Promise<DemographicsAnchorResult> {
    const entry: DemographicsAnchorEntry = { patientId, demographicsHash };
    const tree = buildMerkleTree([entry.demographicsHash]);
    const txHash = await this.submitMerkleRoot(tree.root);
    const anchoredAt = new Date().toISOString();

    return {
      merkleRoot: tree.root,
      stellarTxHash: txHash,
      anchoredAt,
      entries: [
        {
          patientId: entry.patientId,
          merkleProof: getMerkleProof(tree, 0),
        },
      ],
    };
  }

  async verifyDemographicsAnchor(
    patientId: string,
    demographicsHash: string,
    merkleRoot: string,
    merkleProof: Array<{ hash: string; position: "left" | "right" }>,
  ): Promise<boolean> {
    return verifyMerkleProof(demographicsHash, merkleProof, merkleRoot);
  }

  async anchorBatch(
    entries: DemographicsAnchorEntry[],
  ): Promise<DemographicsAnchorResult> {
    if (entries.length === 0) {
      throw new Error("Cannot anchor an empty batch");
    }

    const hashes = entries.map((e) => e.demographicsHash);
    const tree = buildMerkleTree(hashes);
    const txHash = await this.submitMerkleRoot(tree.root);
    const anchoredAt = new Date().toISOString();

    return {
      merkleRoot: tree.root,
      stellarTxHash: txHash,
      anchoredAt,
      entries: entries.map((entry, index) => ({
        patientId: entry.patientId,
        merkleProof: getMerkleProof(tree, index),
      })),
    };
  }

  private async submitMerkleRoot(merkleRoot: string): Promise<string> {
    const account = await this.client.loadAccount(this.keypair.publicKey());
    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.client.network.networkPassphrase,
    })
      .addOperation(
        Operation.manageData({
          name: DEMOGRAPHICS_MERKLE_ROOT_DATA_NAME,
          value: merkleRoot,
        }),
      )
      .setTimeout(30)
      .build();

    transaction.sign(this.keypair);
    const response = await this.client.raw().submitTransaction(transaction);
    return response.hash;
  }
}
