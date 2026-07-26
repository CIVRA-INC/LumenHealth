import { describe, expect, it, vi } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";
import {
  anchorIdentity,
  verifyIdentity,
  buildIdentityDataName,
  computeIdentityHash,
} from "../patient-identity-anchor.js";
import type { StellarClient } from "../client.js";

const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

function makeFakeAccount(publicKey: string) {
  return {
    accountId: () => publicKey,
    sequenceNumber: () => "1",
    incrementSequenceNumber: () => {},
  };
}

function makeFakeClient(submitTransaction: ReturnType<typeof vi.fn>, getManageDataValue: ReturnType<typeof vi.fn>) {
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
    getManageDataValue,
    isHealthy: vi.fn(async () => true),
  } as unknown as StellarClient;

  return { client, loadAccount, raw };
}

describe("buildIdentityDataName", () => {
  it("returns a prefixed data name for the patient ID", () => {
    expect(buildIdentityDataName("patient_001")).toBe("patient_identity_patient_001");
  });
});

describe("computeIdentityHash", () => {
  it("produces a deterministic sha256 hex digest", () => {
    const data = { firstName: "Amina", lastName: "Okafor", dateOfBirth: "1990-03-15" };
    const hash = computeIdentityHash(data);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(computeIdentityHash(data)).toBe(hash);
  });

  it("produces different hashes for different data", () => {
    const a = computeIdentityHash({ firstName: "Amina" });
    const b = computeIdentityHash({ firstName: "Chukwu" });
    expect(a).not.toBe(b);
  });
});

describe("anchorIdentity", () => {
  it("submits a manageData transaction with the identity hash", async () => {
    const submitTransaction = vi.fn(async (_tx: unknown) => ({ hash: "fake-stellar-tx-456" }));
    const getManageDataValue = vi.fn(async () => null);
    const { client, loadAccount } = makeFakeClient(submitTransaction, getManageDataValue);
    const keypair = Keypair.random();

    const result = await anchorIdentity(client, keypair, "patient_001", "abc123hash");

    expect(result.patientId).toBe("patient_001");
    expect(result.identityHash).toBe("abc123hash");
    expect(result.stellarTxHash).toBe("fake-stellar-tx-456");
    expect(result.anchoredAt).toBeTruthy();

    expect(loadAccount).toHaveBeenCalledWith(keypair.publicKey());
    expect(submitTransaction).toHaveBeenCalledTimes(1);

    const submittedTx = submitTransaction.mock.calls[0]?.[0] as {
      operations: { type: string; name: string; value: Uint8Array | Buffer }[];
    };
    expect(submittedTx.operations).toHaveLength(1);
    expect(submittedTx.operations[0]!.type).toBe("manageData");
    expect(submittedTx.operations[0]!.name).toBe("patient_identity_patient_001");
    expect(submittedTx.operations[0]!.value.toString()).toBe("abc123hash");
  });

  it("propagates a submission failure", async () => {
    const submitTransaction = vi.fn(async () => {
      throw new Error("horizon rejected the transaction");
    });
    const getManageDataValue = vi.fn(async () => null);
    const { client } = makeFakeClient(submitTransaction, getManageDataValue);
    const keypair = Keypair.random();

    await expect(
      anchorIdentity(client, keypair, "patient_001", "hash123"),
    ).rejects.toThrow("horizon rejected the transaction");
  });
});

describe("verifyIdentity", () => {
  it("returns verified true when on-chain hash is found", async () => {
    const submitTransaction = vi.fn();
    const getManageDataValue = vi.fn(async () => "expected-hash-value");
    const { client } = makeFakeClient(submitTransaction, getManageDataValue);

    const result = await verifyIdentity(client, "patient_001", {
      stellarTxHash: "some-tx-hash",
    });

    expect(result.verified).toBe(true);
    expect(result.onChainHash).toBe("expected-hash-value");
    expect(result.patientId).toBe("patient_001");
    expect(getManageDataValue).toHaveBeenCalledWith("some-tx-hash", "patient_identity_patient_001");
  });

  it("returns verified false when on-chain hash is not found", async () => {
    const submitTransaction = vi.fn();
    const getManageDataValue = vi.fn(async () => null);
    const { client } = makeFakeClient(submitTransaction, getManageDataValue);

    const result = await verifyIdentity(client, "patient_001", {
      stellarTxHash: "nonexistent-tx",
    });

    expect(result.verified).toBe(false);
    expect(result.onChainHash).toBeNull();
  });
});
