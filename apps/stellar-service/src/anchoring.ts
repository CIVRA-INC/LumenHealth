import { Operation, TransactionBuilder, BASE_FEE } from "@stellar/stellar-sdk";
import type { Keypair, Horizon } from "@stellar/stellar-sdk";
import type { AnchorMode, BatchAnchorResult } from "@lumen/types";
import type { StellarClient } from "./client.js";
import { buildMerkleTree, getMerkleProof } from "./merkle.js";
import { withRetry, type RetryOptions } from "./retry.js";

export type UnanchoredEntry = {
  auditId: string;
  sha256Hash: string;
  /** Lets a reconciliation pass tell a freshly-unanchored entry apart from one that's been stuck for hours. */
  createdAt: string;
};

export type FetchUnanchoredEntries = () => Promise<UnanchoredEntry[]>;
export type PersistAnchorResult = (result: BatchAnchorResult) => Promise<void>;

export type AnchoringServiceOptions = {
  /** Retry policy around submitting the anchor transaction to Horizon. */
  submitRetry?: RetryOptions;
  /** Retry policy around persisting a completed anchor result back to apps/api. */
  persistRetry?: RetryOptions;
};

/** Stellar `manageData` entry names have a 64-byte limit; keep this stable. */
export const MERKLE_ROOT_DATA_NAME = "audit_merkle_root";

export class AnchoringService {
  private readonly submitRetry: RetryOptions;
  private readonly persistRetry: RetryOptions;
  /**
   * Anchor results that succeeded on-chain but whose persist-back call to
   * apps/api kept failing even after retries. Kept in memory rather than
   * dropped — the Stellar transaction already happened, so losing this
   * would mean the next batch re-anchors the same entries under a second
   * transaction instead of just retrying the write-back.
   */
  private pendingPersists: BatchAnchorResult[] = [];

  constructor(
    private readonly client: StellarClient,
    private readonly keypair: Keypair,
    private readonly fetchUnanchoredEntries: FetchUnanchoredEntries,
    private readonly persistAnchorResult: PersistAnchorResult,
    options: AnchoringServiceOptions = {},
  ) {
    this.submitRetry = options.submitRetry ?? {};
    this.persistRetry = options.persistRetry ?? {};
  }

  /** Anchored batches still waiting to be persisted back to apps/api. */
  get pendingPersistCount(): number {
    return this.pendingPersists.length;
  }

  /**
   * Pulls all currently unanchored audit entry hashes and anchors them as
   * one routine batch. Returns `null` if there was nothing to anchor.
   *
   * Always drains any previously-stuck persist-backs first, so a batch
   * that anchored successfully but failed to persist doesn't get re-fetched
   * and re-anchored a second time by this same call.
   */
  async runBatch(): Promise<BatchAnchorResult | null> {
    await this.flushPendingPersists();

    const unanchored = await this.fetchUnanchoredEntries();
    if (unanchored.length === 0) {
      return null;
    }

    return this.anchorEntries(unanchored, "batched");
  }

  /**
   * Anchors exactly the given entries immediately, as a single-entry (or
   * few-entry) transaction of their own — bypassing the routine batch
   * queue entirely. Used for governance-critical actions that shouldn't
   * sit in an un-anchored window until the next scheduled tick. `entries`
   * must be non-empty.
   */
  async anchorImmediate(entries: UnanchoredEntry[]): Promise<BatchAnchorResult> {
    if (entries.length === 0) {
      throw new Error("anchorImmediate requires at least one entry");
    }
    return this.anchorEntries(entries, "immediate");
  }

  /**
   * Builds a Merkle tree over `entries`, writes the root to Stellar via a
   * single `manageData` operation (retried with backoff on transient
   * failure), and persists the resulting tx hash + each entry's inclusion
   * proof, tagged with `mode` so a verifier can tell an immediately-anchored
   * critical action apart from one that waited for the routine batch.
   */
  private async anchorEntries(entries: UnanchoredEntry[], mode: AnchorMode): Promise<BatchAnchorResult> {
    const tree = buildMerkleTree(entries.map((entry) => entry.sha256Hash));
    const response = await withRetry(() => this.submitMerkleRoot(tree.root), this.submitRetry);
    const anchoredAt = new Date().toISOString();

    const result: BatchAnchorResult = {
      merkleRoot: tree.root,
      stellarTxHash: response.hash,
      anchoredAt,
      mode,
      entries: entries.map((entry, index) => ({
        auditId: entry.auditId,
        merkleProof: getMerkleProof(tree, index),
      })),
    };

    await this.persistWithFallback(result);
    return result;
  }

  /**
   * Retries persisting every currently-queued pending result. Results that
   * still fail stay queued for the next call. Safe to call on its own (e.g.
   * from a reconciliation pass) as well as automatically at the start of
   * every `runBatch()`.
   */
  async flushPendingPersists(): Promise<void> {
    if (this.pendingPersists.length === 0) return;

    const stillPending: BatchAnchorResult[] = [];
    for (const result of this.pendingPersists) {
      try {
        await withRetry(() => this.persistAnchorResult(result), this.persistRetry);
      } catch {
        stillPending.push(result);
      }
    }
    this.pendingPersists = stillPending;
  }

  private async persistWithFallback(result: BatchAnchorResult): Promise<void> {
    try {
      await withRetry(() => this.persistAnchorResult(result), this.persistRetry);
    } catch {
      this.pendingPersists.push(result);
    }
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
