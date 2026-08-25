import { describe, expect, it, vi } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";
import { sha256Hash } from "@lumen/types";
import { AnchoringService, MERKLE_ROOT_DATA_NAME } from "../anchoring.js";
import { buildMerkleTree } from "../merkle.js";
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

describe("AnchoringService.runBatch", () => {
  it("returns null and does not touch Stellar when there is nothing to anchor", async () => {
    const submitTransaction = vi.fn();
    const { client } = makeFakeClient(submitTransaction);
    const keypair = Keypair.random();
    const fetchUnanchored = vi.fn(async () => []);
    const persist = vi.fn(async () => {});

    const service = new AnchoringService(client, keypair, fetchUnanchored, persist);
    const result = await service.runBatch();

    expect(result).toBeNull();
    expect(submitTransaction).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
  });

  it("builds a Merkle root, submits one manageData transaction, and persists proofs per entry", async () => {
    const submitTransaction = vi.fn(async (_tx: unknown) => ({ hash: "fake-tx-hash-123" }));
    const { client, loadAccount } = makeFakeClient(submitTransaction);
    const keypair = Keypair.random();

    const entries = [
      { auditId: "a-1", sha256Hash: sha256Hash({ auditId: "a-1" }), createdAt: "2026-01-01T00:00:00.000Z" },
      { auditId: "a-2", sha256Hash: sha256Hash({ auditId: "a-2" }), createdAt: "2026-01-01T00:00:01.000Z" },
      { auditId: "a-3", sha256Hash: sha256Hash({ auditId: "a-3" }), createdAt: "2026-01-01T00:00:02.000Z" },
    ];
    const fetchUnanchored = vi.fn(async () => entries);
    const persist = vi.fn(async () => {});

    const service = new AnchoringService(client, keypair, fetchUnanchored, persist);
    const result = await service.runBatch();

    const expectedRoot = buildMerkleTree(entries.map((e) => e.sha256Hash)).root;

    expect(result).not.toBeNull();
    expect(result!.merkleRoot).toBe(expectedRoot);
    expect(result!.stellarTxHash).toBe("fake-tx-hash-123");
    expect(result!.entries).toHaveLength(3);
    expect(result!.entries.map((e) => e.auditId)).toEqual(["a-1", "a-2", "a-3"]);
    expect(result!.entries[0]!.merkleProof.length).toBeGreaterThan(0);

    expect(loadAccount).toHaveBeenCalledWith(keypair.publicKey());
    expect(submitTransaction).toHaveBeenCalledTimes(1);

    const submittedTx = submitTransaction.mock.calls[0]?.[0] as {
      operations: { type: string; name: string; value: Uint8Array | Buffer }[];
    };
    expect(submittedTx.operations).toHaveLength(1);
    expect(submittedTx.operations[0]!.type).toBe("manageData");
    expect(submittedTx.operations[0]!.name).toBe(MERKLE_ROOT_DATA_NAME);
    expect(submittedTx.operations[0]!.value.toString()).toBe(expectedRoot);

    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith(result);
  });

  it("propagates a submission failure without persisting a result, once retries are exhausted", async () => {
    const submitTransaction = vi.fn(async () => {
      throw new Error("horizon rejected the transaction");
    });
    const { client } = makeFakeClient(submitTransaction);
    const keypair = Keypair.random();
    const fetchUnanchored = vi.fn(async () => [
      { auditId: "a-1", sha256Hash: sha256Hash({ auditId: "a-1" }), createdAt: "2026-01-01T00:00:00.000Z" },
    ]);
    const persist = vi.fn(async () => {});

    // maxAttempts: 1 isolates "submission fails" from retry behavior (covered separately below) and keeps this test fast.
    const service = new AnchoringService(client, keypair, fetchUnanchored, persist, {
      submitRetry: { maxAttempts: 1 },
    });

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
    const keypair = Keypair.random();
    const fetchUnanchored = vi.fn(async () => [
      { auditId: "a-1", sha256Hash: sha256Hash({ auditId: "a-1" }), createdAt: "2026-01-01T00:00:00.000Z" },
    ]);
    const persist = vi.fn(async () => {});
    const sleep = vi.fn(async () => {});

    const service = new AnchoringService(client, keypair, fetchUnanchored, persist, {
      submitRetry: { maxAttempts: 5, sleep },
    });

    const result = await service.runBatch();

    expect(result?.stellarTxHash).toBe("fake-tx-hash-after-retry");
    expect(submitTransaction).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("queues a successfully-anchored result instead of losing it when persisting keeps failing", async () => {
    const submitTransaction = vi.fn(async () => ({ hash: "fake-tx-hash-123" }));
    const { client } = makeFakeClient(submitTransaction);
    const keypair = Keypair.random();
    const fetchUnanchored = vi.fn(async () => [
      { auditId: "a-1", sha256Hash: sha256Hash({ auditId: "a-1" }), createdAt: "2026-01-01T00:00:00.000Z" },
    ]);
    const persist = vi.fn(async () => {
      throw new Error("apps/api unreachable");
    });
    const sleep = vi.fn(async () => {});

    const service = new AnchoringService(client, keypair, fetchUnanchored, persist, {
      persistRetry: { maxAttempts: 2, sleep },
    });

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
    const keypair = Keypair.random();
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

    const service = new AnchoringService(client, keypair, fetchUnanchored, persist, {
      persistRetry: { maxAttempts: 1, sleep },
    });

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
    const keypair = Keypair.random();
    const fetchUnanchored = vi.fn(async () => [
      { auditId: "a-1", sha256Hash: sha256Hash({ auditId: "a-1" }), createdAt: "2026-01-01T00:00:00.000Z" },
    ]);

    let persistShouldFail = true;
    const persist = vi.fn(async () => {
      if (persistShouldFail) throw new Error("apps/api unreachable");
    });

    const service = new AnchoringService(client, keypair, fetchUnanchored, persist, {
      persistRetry: { maxAttempts: 1, sleep: vi.fn(async () => {}) },
    });

    await service.runBatch();
    expect(service.pendingPersistCount).toBe(1);

    persistShouldFail = false;
    await service.flushPendingPersists();

    expect(service.pendingPersistCount).toBe(0);
  });
});
