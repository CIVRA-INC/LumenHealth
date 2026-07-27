import { describe, expect, it, vi } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";
import { DemographicsAnchoringService } from "../demographics-anchoring.service.js";
import type { StellarClient } from "../client.js";
import type {
  DemographicsSnapshot,
  DemographicsAnchorResult,
} from "../demographics-anchoring.service.js";

const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

function makeFakeAccount(publicKey: string) {
  return {
    accountId: () => publicKey,
    sequenceNumber: () => "1",
    incrementSequenceNumber: () => {},
  };
}

function makeFakeClient(submitTransaction: ReturnType<typeof vi.fn>) {
  const loadAccount = vi.fn(async (publicKey: string) =>
    makeFakeAccount(publicKey),
  );
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

function makeSnapshot(
  patientId: string,
  overrides: Partial<DemographicsSnapshot> = {},
): DemographicsSnapshot {
  return {
    patientId,
    firstName: "Jane",
    lastName: "Doe",
    dateOfBirth: "1990-01-15",
    gender: "female",
    emergencyContactName: "John Doe",
    clinicId: "clinic-1",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

function makePersistedAnchor(
  patientId: string,
  merkleRoot: string,
  stellarTxHash: string,
  merkleProof: { position: "left" | "right"; hash: string }[],
): DemographicsAnchorResult {
  return {
    merkleRoot,
    stellarTxHash,
    anchoredAt: new Date().toISOString(),
    entries: [{ patientId, merkleProof }],
  };
}

describe("DemographicsAnchoringService", () => {
  describe("batchAnchorDemographics", () => {
    it("returns null when no snapshots are fetched", async () => {
      const submitTransaction = vi.fn();
      const { client } = makeFakeClient(submitTransaction);
      const keypair = Keypair.random();
      const fetchSnapshots = vi.fn(async () => []);
      const persistAnchor = vi.fn(async () => {});

      const service = new DemographicsAnchoringService(
        client,
        keypair,
        fetchSnapshots,
        persistAnchor,
      );

      const result = await service.batchAnchorDemographics(["p-1"]);
      expect(result).toBeNull();
      expect(submitTransaction).not.toHaveBeenCalled();
      expect(persistAnchor).not.toHaveBeenCalled();
    });

    it("anchors a batch of demographics snapshots to Stellar", async () => {
      const submitTransaction = vi.fn(async () => ({
        hash: "tx-hash-456",
      }));
      const { client, loadAccount } = makeFakeClient(submitTransaction);
      const keypair = Keypair.random();

      const snapshots = [
        makeSnapshot("p-1", { firstName: "Alice" }),
        makeSnapshot("p-2", { firstName: "Bob" }),
      ];
      const fetchSnapshots = vi.fn(async () => snapshots);
      const persistAnchor = vi.fn(async () => {});

      const service = new DemographicsAnchoringService(
        client,
        keypair,
        fetchSnapshots,
        persistAnchor,
      );

      const result = await service.batchAnchorDemographics(["p-1", "p-2"]);

      expect(result).not.toBeNull();
      expect(result!.stellarTxHash).toBe("tx-hash-456");
      expect(result!.entries).toHaveLength(2);
      expect(result!.entries[0]!.patientId).toBe("p-1");
      expect(result!.entries[1]!.patientId).toBe("p-2");
      expect(result!.entries[0]!.merkleProof.length).toBeGreaterThan(0);
      expect(result!.merkleRoot).toMatch(/^[0-9a-f]{64}$/);

      expect(loadAccount).toHaveBeenCalledWith(keypair.publicKey());
      expect(submitTransaction).toHaveBeenCalledTimes(1);
      expect(persistAnchor).toHaveBeenCalledWith(result);
    });

    it("propagates submission errors without persisting", async () => {
      const submitTransaction = vi.fn(async () => {
        throw new Error("horizon rejected");
      });
      const { client } = makeFakeClient(submitTransaction);
      const keypair = Keypair.random();
      const fetchSnapshots = vi.fn(async () => [makeSnapshot("p-1")]);
      const persistAnchor = vi.fn(async () => {});

      const service = new DemographicsAnchoringService(
        client,
        keypair,
        fetchSnapshots,
        persistAnchor,
      );

      await expect(
        service.batchAnchorDemographics(["p-1"]),
      ).rejects.toThrow("horizon rejected");
      expect(persistAnchor).not.toHaveBeenCalled();
    });
  });

  describe("verifyDemographicsIntegrity", () => {
    it("returns invalid when no anchor record exists", async () => {
      const submitTransaction = vi.fn();
      const { client } = makeFakeClient(submitTransaction);
      const keypair = Keypair.random();
      const fetchSnapshots = vi.fn(async () => []);
      const persistAnchor = vi.fn(async () => {});
      const getOnChainMerkleRoot = vi.fn(async () => null);

      const service = new DemographicsAnchoringService(
        client,
        keypair,
        fetchSnapshots,
        persistAnchor,
      );

      const result = await service.verifyDemographicsIntegrity(
        "p-1",
        makeSnapshot("p-1"),
        getOnChainMerkleRoot,
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toBe("no anchor record found");
    });
  });
});
