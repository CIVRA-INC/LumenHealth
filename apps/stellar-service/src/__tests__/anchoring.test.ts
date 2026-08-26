import { describe, expect, it, vi } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";
import { sha256Hash } from "@lumen/types";
import { AnchoringService, MERKLE_ROOT_DATA_NAME } from "../anchoring.js";
import { buildMerkleTree } from "../merkle.js";
import { localCosigner, InsufficientSignaturesError } from "../multisig.js";
import type { StellarClient } from "../client.js";

const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

function makeFakeAccount(publicKey: string) {
  // Minimal shape satisfying stellar-sdk's Account interface used by TransactionBuilder.
  return {
    accountId: () => publicKey,
    sequenceNumber: () => "1",
    incrementSequenceNumber: () => {},
  };
}

function makeFakeClient(submitTransaction: ReturnType<typeof vi.fn>) {
  const loadAccount = vi.fn(async (publicKey: string) => makeFakeAccount(publicKey));
  const raw = vi.fn(() => ({ submitTransaction }));

  const client = {
    network: {
      network: "testnet",
      networkPassphrase: NETWORK_PASSPHRASE,
      horizonUrl: "https://horizon-testnet.stellar.org",
    },
    loadAccount,
    raw,
    isHealthy: vi.fn(async () => true),
  } as unknown as StellarClient;

  return { client, loadAccount, raw };
}

/** A single cosigner whose weight alone meets requiredWeight — behaves like the old single-key setup. */
function makeSingleCosignerSetup() {
  const anchorAccountPublicKey = Keypair.random().publicKey();
  const cosigners = [localCosigner(Keypair.random(), 1)];
  return { anchorAccountPublicKey, cosigners, requiredWeight: 1 };
}

describe("AnchoringService.runBatch", () => {
  it("returns null and does not touch Stellar when there is nothing to anchor", async () => {
    const submitTransaction = vi.fn();
    const { client } = makeFakeClient(submitTransaction);
    const { anchorAccountPublicKey, cosigners, requiredWeight } = makeSingleCosignerSetup();
    const fetchUnanchored = vi.fn(async () => []);
    const persist = vi.fn(async () => {});

    const service = new AnchoringService(
      client,
      anchorAccountPublicKey,
      cosigners,
      requiredWeight,
      fetchUnanchored,
      persist,
    );
    const result = await service.runBatch();

    expect(result).toBeNull();
    expect(submitTransaction).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
  });

  it("builds a Merkle root, submits one manageData transaction signed by every cosigner, and persists proofs per entry", async () => {
    const submitTransaction = vi.fn(async (_tx: unknown) => ({ hash: "fake-tx-hash-123" }));
    const { client, loadAccount } = makeFakeClient(submitTransaction);
    const { anchorAccountPublicKey, cosigners, requiredWeight } = makeSingleCosignerSetup();

    const entries = [
      { auditId: "a-1", sha256Hash: sha256Hash({ auditId: "a-1" }), createdAt: "2026-01-01T00:00:00.000Z" },
      { auditId: "a-2", sha256Hash: sha256Hash({ auditId: "a-2" }), createdAt: "2026-01-01T00:00:01.000Z" },
      { auditId: "a-3", sha256Hash: sha256Hash({ auditId: "a-3" }), createdAt: "2026-01-01T00:00:02.000Z" },
    ];
    const fetchUnanchored = vi.fn(async () => entries);
    const persist = vi.fn(async () => {});

    const service = new AnchoringService(
      client,
      anchorAccountPublicKey,
      cosigners,
      requiredWeight,
      fetchUnanchored,
      persist,
    );
    const result = await service.runBatch();

    const expectedRoot = buildMerkleTree(entries.map((e) => e.sha256Hash)).root;

    expect(result).not.toBeNull();
    expect(result!.merkleRoot).toBe(expectedRoot);
    expect(result!.stellarTxHash).toBe("fake-tx-hash-123");
    expect(result!.entries).toHaveLength(3);
    expect(result!.entries.map((e) => e.auditId)).toEqual(["a-1", "a-2", "a-3"]);
    expect(result!.entries[0]!.merkleProof.length).toBeGreaterThan(0);

    // Loaded from the shared multisig account, not any individual cosigner's own account.
    expect(loadAccount).toHaveBeenCalledWith(anchorAccountPublicKey);
    expect(submitTransaction).toHaveBeenCalledTimes(1);

    const submittedTx = submitTransaction.mock.calls[0]?.[0] as {
      operations: { type: string; name: string; value: Uint8Array | Buffer }[];
      signatures: unknown[];
    };
    expect(submittedTx.operations).toHaveLength(1);
    expect(submittedTx.operations[0]!.type).toBe("manageData");
    expect(submittedTx.operations[0]!.name).toBe(MERKLE_ROOT_DATA_NAME);
    expect(submittedTx.operations[0]!.value.toString()).toBe(expectedRoot);
    expect(submittedTx.signatures).toHaveLength(1);

    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith(result);
  });

  it("fails fast without touching Horizon when cosigner weight is short of the required threshold", async () => {
    const submitTransaction = vi.fn();
    const { client } = makeFakeClient(submitTransaction);
    const anchorAccountPublicKey = Keypair.random().publicKey();
    const onlyOneOfTwoRequired = [localCosigner(Keypair.random(), 1)];
    const fetchUnanchored = vi.fn(async () => [
      { auditId: "a-1", sha256Hash: sha256Hash({ auditId: "a-1" }), createdAt: "2026-01-01T00:00:00.000Z" },
    ]);
    const persist = vi.fn(async () => {});

    const service = new AnchoringService(
      client,
      anchorAccountPublicKey,
      onlyOneOfTwoRequired,
      2,
      fetchUnanchored,
      persist,
    );

    await expect(service.runBatch()).rejects.toBeInstanceOf(InsufficientSignaturesError);
    expect(submitTransaction).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
  });

  it("does not retry an insufficient-signatures failure — retrying can't add more cosigner weight", async () => {
    const submitTransaction = vi.fn();
    const { client } = makeFakeClient(submitTransaction);
    const anchorAccountPublicKey = Keypair.random().publicKey();
    const tooFewCosigners = [localCosigner(Keypair.random(), 1)];
    const fetchUnanchored = vi.fn(async () => [
      { auditId: "a-1", sha256Hash: sha256Hash({ auditId: "a-1" }), createdAt: "2026-01-01T00:00:00.000Z" },
    ]);
    const persist = vi.fn(async () => {});
    const sleep = vi.fn(async () => {});

    const service = new AnchoringService(
      client,
      anchorAccountPublicKey,
      tooFewCosigners,
      2,
      fetchUnanchored,
      persist,
      { submitRetry: { maxAttempts: 5, sleep } },
    );

    await expect(service.runBatch()).rejects.toBeInstanceOf(InsufficientSignaturesError);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("collects signatures from multiple cosigners to meet a >1 threshold", async () => {
    const submitTransaction = vi.fn(async (_tx: unknown) => ({ hash: "fake-tx-hash-multisig" }));
    const { client } = makeFakeClient(submitTransaction);
    const anchorAccountPublicKey = Keypair.random().publicKey();
    const cosigners = [localCosigner(Keypair.random(), 1), localCosigner(Keypair.random(), 1)];
    const fetchUnanchored = vi.fn(async () => [
      { auditId: "a-1", sha256Hash: sha256Hash({ auditId: "a-1" }), createdAt: "2026-01-01T00:00:00.000Z" },
    ]);
    const persist = vi.fn(async () => {});

    const service = new AnchoringService(
      client,
      anchorAccountPublicKey,
      cosigners,
      2,
      fetchUnanchored,
      persist,
    );

    const result = await service.runBatch();

    expect(result?.stellarTxHash).toBe("fake-tx-hash-multisig");
    const submittedTx = submitTransaction.mock.calls[0]?.[0] as { signatures: unknown[] };
    expect(submittedTx.signatures).toHaveLength(2);
  });

  it("propagates a submission failure without persisting a result, once retries are exhausted", async () => {
    const submitTransaction = vi.fn(async () => {
      throw new Error("horizon rejected the transaction");
    });
    const { client } = makeFakeClient(submitTransaction);
    const { anchorAccountPublicKey, cosigners, requiredWeight } = makeSingleCosignerSetup();
    const fetchUnanchored = vi.fn(async () => [
      { auditId: "a-1", sha256Hash: sha256Hash({ auditId: "a-1" }), createdAt: "2026-01-01T00:00:00.000Z" },
    ]);
    const persist = vi.fn(async () => {});

    // maxAttempts: 1 isolates "submission fails" from retry behavior (covered separately below) and keeps this test fast.
    const service = new AnchoringService(
      client,
      anchorAccountPublicKey,
      cosigners,
      requiredWeight,
      fetchUnanchored,
      persist,
      { submitRetry: { maxAttempts: 1 } },
    );

    await expect(service.runBatch()).rejects.toThrow("horizon rejected the transaction");
    expect(persist).not.toHaveBeenCalled();
  });

  it("retries a transient Horizon submission failure and succeeds once it recovers", async () => {
    let attempts = 0;
    const submitTransaction = vi.fn(async () => {
      attempts += 1;
      if (attempts < 3) throw new Error("ECONNRESET");
      return { hash: "fake-tx-hash-after-retry" };
    });
    const { client } = makeFakeClient(submitTransaction);
    const { anchorAccountPublicKey, cosigners, requiredWeight } = makeSingleCosignerSetup();
    const fetchUnanchored = vi.fn(async () => [
      { auditId: "a-1", sha256Hash: sha256Hash({ auditId: "a-1" }), createdAt: "2026-01-01T00:00:00.000Z" },
    ]);
    const persist = vi.fn(async () => {});
    const sleep = vi.fn(async () => {});

    const service = new AnchoringService(
      client,
      anchorAccountPublicKey,
      cosigners,
      requiredWeight,
      fetchUnanchored,
      persist,
      { submitRetry: { maxAttempts: 5, sleep } },
    );

    const result = await service.runBatch();

    expect(result?.stellarTxHash).toBe("fake-tx-hash-after-retry");
    expect(submitTransaction).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("queues a successfully-anchored result instead of losing it when persisting keeps failing", async () => {
    const submitTransaction = vi.fn(async () => ({ hash: "fake-tx-hash-123" }));
    const { client } = makeFakeClient(submitTransaction);
    const { anchorAccountPublicKey, cosigners, requiredWeight } = makeSingleCosignerSetup();
    const fetchUnanchored = vi.fn(async () => [
      { auditId: "a-1", sha256Hash: sha256Hash({ auditId: "a-1" }), createdAt: "2026-01-01T00:00:00.000Z" },
    ]);
    const persist = vi.fn(async () => {
      throw new Error("apps/api unreachable");
    });
    const sleep = vi.fn(async () => {});

    const service = new AnchoringService(
      client,
      anchorAccountPublicKey,
      cosigners,
      requiredWeight,
      fetchUnanchored,
      persist,
      { persistRetry: { maxAttempts: 2, sleep } },
    );

    const result = await service.runBatch();

    // The on-chain anchor still succeeded and is still returned to the caller...
    expect(result?.stellarTxHash).toBe("fake-tx-hash-123");
    // ...even though every persist attempt failed.
    expect(persist).toHaveBeenCalledTimes(2);
    expect(service.pendingPersistCount).toBe(1);
  });

  it("flushes a queued pending persist at the start of the next runBatch before fetching new entries", async () => {
    const submitTransaction = vi.fn(async () => ({ hash: "fake-tx-hash-123" }));
    const { client } = makeFakeClient(submitTransaction);
    const { anchorAccountPublicKey, cosigners, requiredWeight } = makeSingleCosignerSetup();
    const fetchUnanchored = vi
      .fn()
      .mockResolvedValueOnce([
        { auditId: "a-1", sha256Hash: sha256Hash({ auditId: "a-1" }), createdAt: "2026-01-01T00:00:00.000Z" },
      ])
      .mockResolvedValueOnce([]);

    let persistShouldFail = true;
    const persist = vi.fn(async () => {
      if (persistShouldFail) throw new Error("apps/api unreachable");
    });
    const sleep = vi.fn(async () => {});

    const service = new AnchoringService(
      client,
      anchorAccountPublicKey,
      cosigners,
      requiredWeight,
      fetchUnanchored,
      persist,
      { persistRetry: { maxAttempts: 1, sleep } },
    );

    const first = await service.runBatch();
    expect(first?.stellarTxHash).toBe("fake-tx-hash-123");
    expect(service.pendingPersistCount).toBe(1);

    // apps/api recovers before the next scheduled tick.
    persistShouldFail = false;
    const second = await service.runBatch();

    // No new entries were unanchored, so this call anchors nothing new...
    expect(second).toBeNull();
    // ...but the previously-stuck result got persisted, and the same
    // entries were never fetched/anchored a second time.
    expect(service.pendingPersistCount).toBe(0);
    expect(submitTransaction).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledTimes(2);
  });

  it("flushPendingPersists can be called on its own (e.g. from a reconciliation pass)", async () => {
    const submitTransaction = vi.fn(async () => ({ hash: "fake-tx-hash-123" }));
    const { client } = makeFakeClient(submitTransaction);
    const { anchorAccountPublicKey, cosigners, requiredWeight } = makeSingleCosignerSetup();
    const fetchUnanchored = vi.fn(async () => [
      { auditId: "a-1", sha256Hash: sha256Hash({ auditId: "a-1" }), createdAt: "2026-01-01T00:00:00.000Z" },
    ]);

    let persistShouldFail = true;
    const persist = vi.fn(async () => {
      if (persistShouldFail) throw new Error("apps/api unreachable");
    });

    const service = new AnchoringService(
      client,
      anchorAccountPublicKey,
      cosigners,
      requiredWeight,
      fetchUnanchored,
      persist,
      { persistRetry: { maxAttempts: 1, sleep: vi.fn(async () => {}) } },
    );

    await service.runBatch();
    expect(service.pendingPersistCount).toBe(1);

    persistShouldFail = false;
    await service.flushPendingPersists();

    expect(service.pendingPersistCount).toBe(0);
  });
});

describe("AnchoringService — concurrent call serialization", () => {
  it("never lets two overlapping runBatch() calls submit at the same time", async () => {
    // Simulates two scheduler ticks overlapping because the first is slow
    // (e.g. Horizon latency) and the interval fires again before it
    // finishes. Without serialization, both would call loadAccount/build/
    // submit concurrently and race on the account's sequence number.
    const callOrder: string[] = [];
    let resolveFirstSubmit!: () => void;
    const firstSubmitGate = new Promise<void>((resolve) => {
      resolveFirstSubmit = resolve;
    });

    let submitCount = 0;
    const submitTransaction = vi.fn(async (_tx: unknown) => {
      submitCount += 1;
      const label = `submit-${submitCount}`;
      callOrder.push(`${label}-start`);
      if (submitCount === 1) {
        await firstSubmitGate; // held open until the test explicitly releases it
      }
      callOrder.push(`${label}-end`);
      return { hash: `tx-hash-${submitCount}` };
    });
    const { client } = makeFakeClient(submitTransaction);
    const keypair = Keypair.random();

    // Each call sees a fresh, disjoint entry so a real double-anchor (same
    // entry anchored twice) isn't the only thing this test would catch —
    // interleaved submission itself is the thing being verified.
    let fetchCount = 0;
    const fetchUnanchored = vi.fn(async () => {
      fetchCount += 1;
      return [
        { auditId: `a-${fetchCount}`, sha256Hash: sha256Hash({ auditId: `a-${fetchCount}` }), createdAt: "2026-01-01T00:00:00.000Z" },
      ];
    });
    const persist = vi.fn(async () => {});

    const service = new AnchoringService(client, keypair, fetchUnanchored, persist);

    const first = service.runBatch();
    // Give the first call a tick to reach (and block inside) submitTransaction.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(callOrder).toEqual(["submit-1-start"]);

    const second = service.runBatch();
    // The second call must NOT reach submitTransaction while the first is
    // still mid-flight — it should be queued, not interleaved.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(callOrder).toEqual(["submit-1-start"]);

    resolveFirstSubmit();
    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(callOrder).toEqual(["submit-1-start", "submit-1-end", "submit-2-start", "submit-2-end"]);
    expect(firstResult?.stellarTxHash).toBe("tx-hash-1");
    expect(secondResult?.stellarTxHash).toBe("tx-hash-2");
  });

  it("a second overlapping call re-fetches after the first persists, so it never re-anchors the same entry", async () => {
    // A minimal stateful fake standing in for apps/api's audit store: an
    // entry disappears from "unanchored" once persistAnchorResult marks it.
    const unanchoredIds = new Set(["a-1"]);
    const fetchUnanchored = vi.fn(async () =>
      [...unanchoredIds].map((auditId) => ({
        auditId,
        sha256Hash: sha256Hash({ auditId }),
        createdAt: "2026-01-01T00:00:00.000Z",
      })),
    );
    const persist = vi.fn(async (result: { entries: { auditId: string }[] }) => {
      for (const { auditId } of result.entries) unanchoredIds.delete(auditId);
    });

    let resolveFirstSubmit!: () => void;
    const firstSubmitGate = new Promise<void>((resolve) => {
      resolveFirstSubmit = resolve;
    });
    let submitCount = 0;
    const submitTransaction = vi.fn(async (_tx: unknown) => {
      submitCount += 1;
      if (submitCount === 1) await firstSubmitGate;
      return { hash: `tx-hash-${submitCount}` };
    });
    const { client } = makeFakeClient(submitTransaction);
    const keypair = Keypair.random();

    const service = new AnchoringService(client, keypair, fetchUnanchored, persist);

    const first = service.runBatch();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const second = service.runBatch(); // queued behind `first`

    resolveFirstSubmit();
    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(firstResult?.entries.map((e) => e.auditId)).toEqual(["a-1"]);
    // By the time the second call's fetch runs, a-1 has already been
    // persisted as anchored — so the second call finds nothing to anchor,
    // rather than re-anchoring a-1 under a second transaction.
    expect(secondResult).toBeNull();
    expect(submitTransaction).toHaveBeenCalledTimes(1);
  });
});
