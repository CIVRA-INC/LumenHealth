import { Operation, TransactionBuilder, BASE_FEE } from "@stellar/stellar-sdk";
import type { Horizon } from "@stellar/stellar-sdk";
import type { BatchAnchorResult } from "@lumen/types";
import type { StellarClient } from "./client.js";
import { buildMerkleTree, getMerkleProof } from "./merkle.js";
import { withRetry, type RetryOptions } from "./retry.js";
import { collectSignatures, InsufficientSignaturesError, type Cosigner } from "./multisig.js";

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
    /** The shared multisig account anchor transactions are submitted from — not any one cosigner's own account. */
    private readonly anchorAccountPublicKey: string,
    private readonly cosigners: Cosigner[],
    /** Combined cosigner weight required to submit — matches the account's on-chain threshold. */
    private readonly requiredWeight: number,
    private readonly fetchUnanchoredEntries: FetchUnanchoredEntries,
    private readonly persistAnchorResult: PersistAnchorResult,
    options: AnchoringServiceOptions = {},
  ) {
    // A short-of-threshold signature set will never be fixed by retrying
    // against the same cosigners, so it's excluded from retry by default —
    // unlike a Horizon network blip, retrying it would only waste attempts.
    this.submitRetry = {
      isRetryable: (error) => !(error instanceof InsufficientSignaturesError),
      ...options.submitRetry,
    };
    this.persistRetry = options.persistRetry ?? {};
  }

  /**
   * Chains every submission-affecting call (runBatch, flushPendingPersists)
   * onto a single promise queue, so two overlapping invocations — e.g. a
   * scheduled tick that's still running when the next interval fires
   * because Horizon was slow — never build and submit transactions
   * concurrently. Concurrent submissions against the same account race on
   * its sequence number (`tx_bad_seq`) and, worse, can each independently
   * fetch the same "unanchored" entries before either has persisted a
   * result, anchoring them twice under two different transactions. Once
   * everything that submits to this account shares one `AnchoringService`
   * instance (true after this process also serves any immediate-anchor
   * path — see the anchoring-scheduler/internal-API process consolidation),
   * this queue is what actually guarantees "one submission at a time" for
   * the whole account, not just within a single call.
   */
  private serialQueue: Promise<unknown> = Promise.resolve();

  private async serialize<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.serialQueue.then(fn, fn);
    this.serialQueue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  /** Anchored batches still waiting to be persisted back to apps/api. */
  get pendingPersistCount(): number {
    return this.pendingPersists.length;
  }

  /**
   * Pulls all currently unanchored audit entry hashes, builds a Merkle tree
   * over them, writes the root to Stellar via a single `manageData`
   * operation (retried with backoff on transient failure), and persists
   * the resulting tx hash + each entry's inclusion proof. Returns `null` if
   * there was nothing to anchor.
   *
   * Queued behind any other in-flight `runBatch`/`flushPendingPersists`
   * call on this instance (see `serialize`), and always drains any
   * previously-stuck persist-backs first — so a batch that anchored
   * successfully but failed to persist doesn't get re-fetched and
   * re-anchored a second time, whether by an overlapping call or by this
   * same call's own retry.
   */
  async runBatch(): Promise<BatchAnchorResult | null> {
    return this.serialize(() => this.runBatchLocked());
  }

  private async runBatchLocked(): Promise<BatchAnchorResult | null> {
    await this.flushPendingPersistsLocked();

    const unanchored = await this.fetchUnanchoredEntries();
    if (unanchored.length === 0) {
      return null;
    }

    const tree = buildMerkleTree(unanchored.map((entry) => entry.sha256Hash));
    const response = await withRetry(() => this.submitMerkleRoot(tree.root), this.submitRetry);
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

    await this.persistWithFallback(result);
    return result;
  }

  /**
   * Retries persisting every currently-queued pending result. Results that
   * still fail stay queued for the next call. Safe to call on its own (e.g.
   * from a reconciliation pass) as well as automatically at the start of
   * every `runBatch()` — queued the same way, so it never runs concurrently
   * with an in-flight batch.
   */
  async flushPendingPersists(): Promise<void> {
    return this.serialize(() => this.flushPendingPersistsLocked());
  }

  private async flushPendingPersistsLocked(): Promise<void> {
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
    const account = await this.client.loadAccount(this.anchorAccountPublicKey);

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

    // Fails fast, before ever touching Horizon, if the cosigners we have on
    // hand don't add up to the account's required signing weight.
    await collectSignatures(transaction, this.cosigners, this.requiredWeight);

    return this.client.raw().submitTransaction(transaction);
  }
}
