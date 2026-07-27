import { sha256Hash } from "@lumen/types";
import type { StellarClient } from "./client.js";
import { MERKLE_ROOT_DATA_NAME, type UnanchoredEntry } from "./anchoring.js";
import { buildMerkleTree, getMerkleProof } from "./merkle.js";
import {
  Operation,
  TransactionBuilder,
  BASE_FEE,
} from "@stellar/stellar-sdk";
import type { Keypair, Horizon } from "@stellar/stellar-sdk";

export type DemographicsSnapshot = {
  patientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  emergencyContactName: string;
  clinicId: string;
  updatedAt: string;
};

export type DemographicsAnchorResult = {
  merkleRoot: string;
  stellarTxHash: string;
  anchoredAt: string;
  entries: {
    patientId: string;
    merkleProof: { position: "left" | "right"; hash: string }[];
  }[];
};

export type FetchDemographicsSnapshots = (
  patientIds: string[],
) => Promise<DemographicsSnapshot[]>;

export type PersistDemographicsAnchor = (
  result: DemographicsAnchorResult,
) => Promise<void>;

export type GetOnChainMerkleRoot = (txHash: string) => Promise<string | null>;

export class DemographicsAnchoringService {
  constructor(
    private readonly client: StellarClient,
    private readonly keypair: Keypair,
    private readonly fetchSnapshots: FetchDemographicsSnapshots,
    private readonly persistAnchor: PersistDemographicsAnchor,
  ) {}

  async batchAnchorDemographics(
    patientIds: string[],
  ): Promise<DemographicsAnchorResult | null> {
    const snapshots = await this.fetchSnapshots(patientIds);
    if (snapshots.length === 0) {
      return null;
    }

    const hashes = snapshots.map((s) => this.hashSnapshot(s));
    const tree = buildMerkleTree(hashes);
    const response = await this.submitMerkleRoot(tree.root);
    const anchoredAt = new Date().toISOString();

    const result: DemographicsAnchorResult = {
      merkleRoot: tree.root,
      stellarTxHash: response.hash,
      anchoredAt,
      entries: snapshots.map((s, index) => ({
        patientId: s.patientId,
        merkleProof: getMerkleProof(tree, index),
      })),
    };

    await this.persistAnchor(result);
    return result;
  }

  async verifyDemographicsIntegrity(
    patientId: string,
    snapshot: DemographicsSnapshot,
    getOnChainMerkleRoot: GetOnChainMerkleRoot,
  ): Promise<{ valid: boolean; reason?: string }> {
    const currentHash = this.hashSnapshot(snapshot);

    const stored = await this.getStoredAnchor(patientId);
    if (!stored) {
      return { valid: false, reason: "no anchor record found" };
    }

    if (!stored.stellarTxHash || !stored.merkleRoot || !stored.merkleProof) {
      return { valid: false, reason: "entry is unanchored" };
    }

    const chainRoot = await getOnChainMerkleRoot(stored.stellarTxHash);
    if (!chainRoot || chainRoot !== stored.merkleRoot) {
      return { valid: false, reason: "on-chain root does not match stored merkle root" };
    }

    const { verifyMerkleProof } = await import("@lumen/types");
    if (!verifyMerkleProof(currentHash, stored.merkleProof, chainRoot)) {
      return { valid: false, reason: "merkle proof does not resolve to the on-chain root" };
    }

    return { valid: true };
  }

  private hashSnapshot(snapshot: DemographicsSnapshot): string {
    return sha256Hash({
      patientId: snapshot.patientId,
      firstName: snapshot.firstName,
      lastName: snapshot.lastName,
      dateOfBirth: snapshot.dateOfBirth,
      gender: snapshot.gender,
      emergencyContactName: snapshot.emergencyContactName,
      clinicId: snapshot.clinicId,
      updatedAt: snapshot.updatedAt,
    });
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

  private async getStoredAnchor(
    patientId: string,
  ): Promise<DemographicsAnchorResult["entries"][number] | null> {
    // In production this would query a persistence layer.
    // For now returns null so verifyDemographicsIntegrity
    // correctly reports "no anchor record found" when unmocked.
    void patientId;
    return null;
  }
}
