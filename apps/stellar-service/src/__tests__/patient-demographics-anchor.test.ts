import { describe, expect, it, vi } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";
import { sha256Hash } from "@lumen/types";
import {
  PatientDemographicsAnchorService,
  DEMOGRAPHICS_MERKLE_ROOT_DATA_NAME,
} from "../patient-demographics-anchor.js";
import { buildMerkleTree } from "../merkle.js";
import type { StellarClient } from "../client.js";

const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

function makeFakeAccount(publicKey: string) {
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

describe("PatientDemographicsAnchorService.anchorDemographics", () => {
  it("anchors a single demographics hash to Stellar via manageData", async () => {
    const submitTransaction = vi.fn(async () => ({ hash: "demo-tx-hash-001" }));
    const { client, loadAccount } = makeFakeClient(submitTransaction);
    const keypair = Keypair.random();

    const demographicsHash = sha256Hash({ patientId: "p-1", data: "demographics" });
    const service = new PatientDemographicsAnchorService(client, keypair);
    const result = await service.anchorDemographics("p-1", demographicsHash);

    const tree = buildMerkleTree([demographicsHash]);

    expect(result.merkleRoot).toBe(tree.root);
    expect(result.stellarTxHash).toBe("demo-tx-hash-001");
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].patientId).toBe("p-1");
    expect(result.entries[0].merkleProof.length).toBeGreaterThan(0);
    expect(loadAccount).toHaveBeenCalledWith(keypair.publicKey());
    expect(submitTransaction).toHaveBeenCalledTimes(1);

    const submittedTx = submitTransaction.mock.calls[0]?.[0] as {
      operations: { type: string; name: string; value: Uint8Array | Buffer }[];
    };
    expect(submittedTx.operations).toHaveLength(1);
    expect(submittedTx.operations[0]!.type).toBe("manageData");
    expect(submittedTx.operations[0]!.name).toBe(DEMOGRAPHICS_MERKLE_ROOT_DATA_NAME);
    expect(submittedTx.operations[0]!.value.toString()).toBe(tree.root);
  });
});

describe("PatientDemographicsAnchorService.anchorBatch", () => {
  it("anchors multiple demographics entries in one transaction", async () => {
    const submitTransaction = vi.fn(async () => ({ hash: "batch-tx-hash-002" }));
    const { client } = makeFakeClient(submitTransaction);
    const keypair = Keypair.random();

    const entries = [
      { patientId: "p-1", demographicsHash: sha256Hash({ patientId: "p-1" }) },
      { patientId: "p-2", demographicsHash: sha256Hash({ patientId: "p-2" }) },
      { patientId: "p-3", demographicsHash: sha256Hash({ patientId: "p-3" }) },
    ];

    const service = new PatientDemographicsAnchorService(client, keypair);
    const result = await service.anchorBatch(entries);

    const expectedTree = buildMerkleTree(entries.map((e) => e.demographicsHash));
    expect(result.merkleRoot).toBe(expectedTree.root);
    expect(result.stellarTxHash).toBe("batch-tx-hash-002");
    expect(result.entries).toHaveLength(3);
    expect(result.entries.map((e) => e.patientId)).toEqual(["p-1", "p-2", "p-3"]);
    expect(submitTransaction).toHaveBeenCalledTimes(1);
  });

  it("throws on empty batch", async () => {
    const { client } = makeFakeClient(vi.fn());
    const keypair = Keypair.random();
    const service = new PatientDemographicsAnchorService(client, keypair);

    await expect(service.anchorBatch([])).rejects.toThrow("Cannot anchor an empty batch");
  });
});

describe("PatientDemographicsAnchorService.verifyDemographicsAnchor", () => {
  it("returns true for a valid proof", async () => {
    const { client } = makeFakeClient(vi.fn());
    const keypair = Keypair.random();
    const service = new PatientDemographicsAnchorService(client, keypair);

    const hash = sha256Hash({ patientId: "p-verify" });
    const tree = buildMerkleTree([hash]);
    const proof = (await import("../merkle.js")).getMerkleProof(tree, 0);

    const valid = await service.verifyDemographicsAnchor("p-verify", hash, tree.root, proof);
    expect(valid).toBe(true);
  });

  it("returns false for an invalid proof", async () => {
    const { client } = makeFakeClient(vi.fn());
    const keypair = Keypair.random();
    const service = new PatientDemographicsAnchorService(client, keypair);

    const hash = sha256Hash({ patientId: "p-invalid" });
    const wrongHash = sha256Hash({ patientId: "p-wrong" });
    const tree = buildMerkleTree([hash]);
    const proof = (await import("../merkle.js")).getMerkleProof(tree, 0);

    const valid = await service.verifyDemographicsAnchor("p-invalid", wrongHash, tree.root, proof);
    expect(valid).toBe(false);
  });
});

describe("PatientDemographicsAnchorService — submission failure", () => {
  it("propagates a Stellar submission error", async () => {
    const submitTransaction = vi.fn(async () => {
      throw new Error("horizon rejected the transaction");
    });
    const { client } = makeFakeClient(submitTransaction);
    const keypair = Keypair.random();
    const service = new PatientDemographicsAnchorService(client, keypair);

    await expect(
      service.anchorDemographics("p-err", sha256Hash({ patientId: "p-err" })),
    ).rejects.toThrow("horizon rejected the transaction");
  });
});
