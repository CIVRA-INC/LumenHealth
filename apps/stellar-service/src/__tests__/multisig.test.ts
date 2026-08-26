import { describe, expect, it, vi } from "vitest";
import { Keypair, TransactionBuilder, Operation, BASE_FEE, Networks } from "@stellar/stellar-sdk";
import { collectSignatures, localCosigner, buildMultisigSetupOperations, InsufficientSignaturesError } from "../multisig.js";
import type { Cosigner } from "../multisig.js";

function makeFakeAccount(publicKey: string) {
  return {
    accountId: () => publicKey,
    sequenceNumber: () => "1",
    incrementSequenceNumber: () => {},
  };
}

function buildTestTransaction(sourcePublicKey: string) {
  const account = makeFakeAccount(sourcePublicKey);
  return new TransactionBuilder(account as never, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.manageData({ name: "test", value: "value" }))
    .setTimeout(30)
    .build();
}

describe("localCosigner", () => {
  it("wraps a Keypair so signing actually adds its signature to the transaction", async () => {
    const keypair = Keypair.random();
    const cosigner = localCosigner(keypair, 1);
    const tx = buildTestTransaction(keypair.publicKey());

    expect(tx.signatures).toHaveLength(0);
    await cosigner.sign(tx);

    expect(tx.signatures).toHaveLength(1);
    expect(cosigner.publicKey).toBe(keypair.publicKey());
    expect(cosigner.weight).toBe(1);
  });
});

describe("collectSignatures", () => {
  it("succeeds once combined cosigner weight meets the required threshold", async () => {
    const source = Keypair.random();
    const a = localCosigner(Keypair.random(), 1);
    const b = localCosigner(Keypair.random(), 1);
    const tx = buildTestTransaction(source.publicKey());

    await collectSignatures(tx, [a, b], 2);

    expect(tx.signatures).toHaveLength(2);
  });

  it("throws InsufficientSignaturesError without submitting when weight falls short", async () => {
    const source = Keypair.random();
    const onlyOne = localCosigner(Keypair.random(), 1);
    const tx = buildTestTransaction(source.publicKey());

    await expect(collectSignatures(tx, [onlyOne], 2)).rejects.toBeInstanceOf(InsufficientSignaturesError);
  });

  it("reports the collected and required weight on the thrown error", async () => {
    const source = Keypair.random();
    const onlyOne = localCosigner(Keypair.random(), 1);
    const tx = buildTestTransaction(source.publicKey());

    try {
      await collectSignatures(tx, [onlyOne], 3);
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(InsufficientSignaturesError);
      const err = error as InstanceType<typeof InsufficientSignaturesError>;
      expect(err.collectedWeight).toBe(1);
      expect(err.requiredWeight).toBe(3);
    }
  });

  it("supports a mix of unequal signer weights (e.g. 2-of-3 with weighted signers)", async () => {
    const source = Keypair.random();
    const heavy = localCosigner(Keypair.random(), 2);
    const light = localCosigner(Keypair.random(), 1);
    const tx = buildTestTransaction(source.publicKey());

    // The heavy signer alone already meets a threshold of 2.
    await collectSignatures(tx, [heavy], 2);
    expect(tx.signatures).toHaveLength(1);

    const tx2 = buildTestTransaction(source.publicKey());
    await expect(collectSignatures(tx2, [light], 2)).rejects.toBeInstanceOf(InsufficientSignaturesError);
  });

  it("calls sign on every cosigner even if an earlier one alone would already meet the threshold", async () => {
    // Collecting is currently "ask everyone, then check total" rather than
    // short-circuiting — cheap for local cosigners, and simpler than trying
    // to guess a minimal signing set when weights vary.
    const source = Keypair.random();
    const signSpyA = vi.fn(async () => {});
    const signSpyB = vi.fn(async () => {});
    const a: Cosigner = { publicKey: "A", weight: 5, sign: signSpyA };
    const b: Cosigner = { publicKey: "B", weight: 1, sign: signSpyB };
    const tx = buildTestTransaction(source.publicKey());

    await collectSignatures(tx, [a, b], 5);

    expect(signSpyA).toHaveBeenCalledTimes(1);
    expect(signSpyB).toHaveBeenCalledTimes(1);
  });
});

describe("buildMultisigSetupOperations", () => {
  it("adds one setOptions signer operation per cosigner, plus a final thresholds/master-weight operation", () => {
    const cosigners = [
      { publicKey: Keypair.random().publicKey(), weight: 1 },
      { publicKey: Keypair.random().publicKey(), weight: 1 },
      { publicKey: Keypair.random().publicKey(), weight: 1 },
    ];

    const ops = buildMultisigSetupOperations(cosigners, 2);
    expect(ops).toHaveLength(4);

    // Operation.setOptions() returns raw XDR — round-trip through a real
    // transaction to inspect the friendly, decoded operation shape, the
    // same way anchoring.test.ts inspects the manageData operation it builds.
    const source = Keypair.random();
    const account = makeFakeAccount(source.publicKey());
    const tx = new TransactionBuilder(account as never, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    });
    for (const op of ops) tx.addOperation(op);
    const built = tx.setTimeout(30).build();

    const decodedOps = built.operations as {
      type: string;
      signer?: { ed25519PublicKey?: string; weight?: number };
      masterWeight?: number;
      lowThreshold?: number;
      medThreshold?: number;
      highThreshold?: number;
    }[];

    expect(decodedOps).toHaveLength(4);
    for (let i = 0; i < 3; i += 1) {
      expect(decodedOps[i]!.type).toBe("setOptions");
      expect(decodedOps[i]!.signer?.ed25519PublicKey).toBe(cosigners[i]!.publicKey);
      expect(decodedOps[i]!.signer?.weight).toBe(1);
    }

    const finalOp = decodedOps[3]!;
    expect(finalOp.masterWeight).toBe(0);
    expect(finalOp.lowThreshold).toBe(2);
    expect(finalOp.medThreshold).toBe(2);
    expect(finalOp.highThreshold).toBe(2);
  });
});
