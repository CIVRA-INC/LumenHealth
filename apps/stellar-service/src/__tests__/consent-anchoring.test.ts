import { describe, expect, it, vi } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";
import { ConsentAnchoringService, CONSENT_DATA_PREFIX } from "../consent-anchoring.service.js";
import { signPayload } from "../signing.js";
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

describe("ConsentAnchoringService.anchorConsent", () => {
  it("submits a manageData transaction with the consent hash and returns a signed proof", async () => {
    const submitTransaction = vi.fn(async () => ({ hash: "consent-tx-hash-456" }));
    const { client, loadAccount } = makeFakeClient(submitTransaction);
    const keypair = Keypair.random();

    const consentHash = "abc123consenthash";
    const fetchConsentHash = vi.fn(async () => consentHash);

    const service = new ConsentAnchoringService(client, keypair, fetchConsentHash);
    const result = await service.anchorConsent("patient_001", consentHash);

    expect(result.patientId).toBe("patient_001");
    expect(result.consentHash).toBe(consentHash);
    expect(result.stellarTxHash).toBe("consent-tx-hash-456");
    expect(result.anchoredAt).toBeTruthy();
    expect(result.proof.signature).toBeTruthy();
    expect(result.proof.publicKey).toBe(keypair.publicKey());

    expect(loadAccount).toHaveBeenCalledWith(keypair.publicKey());
    expect(submitTransaction).toHaveBeenCalledTimes(1);

    const submittedTx = submitTransaction.mock.calls[0]?.[0] as {
      operations: { type: string; name: string; value: Uint8Array | Buffer }[];
    };
    expect(submittedTx.operations).toHaveLength(1);
    expect(submittedTx.operations[0]!.type).toBe("manageData");
    expect(submittedTx.operations[0]!.name).toBe(`${CONSENT_DATA_PREFIX}patient_001`);
    expect(submittedTx.operations[0]!.value.toString()).toBe(consentHash);
  });

  it("propagates a submission failure", async () => {
    const submitTransaction = vi.fn(async () => {
      throw new Error("horizon rejected the transaction");
    });
    const { client } = makeFakeClient(submitTransaction);
    const keypair = Keypair.random();
    const fetchConsentHash = vi.fn(async () => "some-hash");

    const service = new ConsentAnchoringService(client, keypair, fetchConsentHash);

    await expect(service.anchorConsent("patient_002", "some-hash")).rejects.toThrow(
      "horizon rejected the transaction",
    );
  });
});

describe("ConsentAnchoringService.verifyConsent", () => {
  it("returns valid when the proof signature matches the stored consent hash", async () => {
    const { client } = makeFakeClient(vi.fn());
    const keypair = Keypair.random();
    const consentHash = "valid-consent-hash";
    const fetchConsentHash = vi.fn(async () => consentHash);

    const service = new ConsentAnchoringService(client, keypair, fetchConsentHash);
    const proof = signPayload(keypair, `patient_001:${consentHash}`);

    const result = await service.verifyConsent("patient_001", proof);

    expect(result.isValid).toBe(true);
    expect(result.patientId).toBe("patient_001");
    expect(result.verifiedAt).toBeTruthy();
    expect(result.reason).toBeUndefined();
  });

  it("returns invalid when no consent record is found", async () => {
    const { client } = makeFakeClient(vi.fn());
    const keypair = Keypair.random();
    const fetchConsentHash = vi.fn(async () => null);

    const service = new ConsentAnchoringService(client, keypair, fetchConsentHash);
    const proof = signPayload(keypair, "patient_999:missing-hash");

    const result = await service.verifyConsent("patient_999", proof);

    expect(result.isValid).toBe(false);
    expect(result.reason).toBe("No consent record found for patient.");
  });

  it("returns invalid when the proof is signed by an unexpected key", async () => {
    const { client } = makeFakeClient(vi.fn());
    const keypair = Keypair.random();
    const otherKeypair = Keypair.random();
    const consentHash = "stored-consent-hash";
    const fetchConsentHash = vi.fn(async () => consentHash);

    const service = new ConsentAnchoringService(client, keypair, fetchConsentHash);

    const proof = signPayload(otherKeypair, `patient_001:${consentHash}`);
    const result = await service.verifyConsent("patient_001", proof);

    expect(result.isValid).toBe(false);
    expect(result.reason).toBe("Consent proof was not signed by the expected anchor key.");
  });

  it("returns invalid when the proof signature does not match the consent hash", async () => {
    const { client } = makeFakeClient(vi.fn());
    const keypair = Keypair.random();
    const consentHash = "stored-consent-hash";
    const fetchConsentHash = vi.fn(async () => consentHash);

    const service = new ConsentAnchoringService(client, keypair, fetchConsentHash);

    const proof = signPayload(keypair, "patient_001:wrong-hash");
    const result = await service.verifyConsent("patient_001", proof);

    expect(result.isValid).toBe(false);
    expect(result.reason).toBe("Consent proof signature verification failed.");
  });
});
