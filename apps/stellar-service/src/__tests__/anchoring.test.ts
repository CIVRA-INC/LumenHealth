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
      { auditId: "a-1", sha256Hash: sha256Hash({ auditId: "a-1" }) },
      { auditId: "a-2", sha256Hash: sha256Hash({ auditId: "a-2" }) },
      { auditId: "a-3", sha256Hash: sha256Hash({ auditId: "a-3" }) },
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

  it("propagates a submission failure without persisting a result", async () => {
    const submitTransaction = vi.fn(async () => {
      throw new Error("horizon rejected the transaction");
    });
    const { client } = makeFakeClient(submitTransaction);
    const keypair = Keypair.random();
    const fetchUnanchored = vi.fn(async () => [{ auditId: "a-1", sha256Hash: sha256Hash({ auditId: "a-1" }) }]);
    const persist = vi.fn(async () => {});

    const service = new AnchoringService(client, keypair, fetchUnanchored, persist);

    await expect(service.runBatch()).rejects.toThrow("horizon rejected the transaction");
    expect(persist).not.toHaveBeenCalled();
  });
});
