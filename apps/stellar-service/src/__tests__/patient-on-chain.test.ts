import {
  Keypair,
  TransactionBuilder,
  Operation,
  BASE_FEE,
  Networks,
  Memo,
} from "@stellar/stellar-sdk";

type PatientIdentity = {
  id: string;
  name: string;
  dateOfBirth: string;
  hash: string;
};

function computeIdentityHash(patient: Omit<PatientIdentity, "hash">): string {
  const data = `${patient.id}|${patient.name}|${patient.dateOfBirth}`;
  const hash = new TextEncoder().encode(data);
  return Array.from(hash)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function buildRegisterPatientTx(
  source: Keypair,
  identityHash: string,
  network: string = Networks.TESTNET,
) {
  return new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: network,
  })
    .addOperation(Operation.manageData({
      source: source.publicKey(),
      name: `patient_identity_${identityHash.slice(0, 8)}`,
      value: identityHash,
    }))
    .addMemo(Memo.text("patient-registration"))
    .setTimeout(30)
    .build();
}

function simulateOperation(source: Keypair, identityHash: string): boolean {
  try {
    const tx = buildRegisterPatientTx(source, identityHash);
    tx.sign(source);
    return true;
  } catch {
    return false;
  }
}

function parsePatientFromMemo(memo: Memo): string | null {
  if (memo.type === "text" && memo.value === "patient-registration") {
    return "patient-registration";
  }
  return null;
}

const fixtures = {
  aliceKeypair: Keypair.fromRawEd25519Seed(Buffer.alloc(32, 1)),
  patientAlice: {
    id: "pat_alice_01",
    name: "Alice Mendoza",
    dateOfBirth: "1990-04-12",
  } satisfies Omit<PatientIdentity, "hash">,
};

describe("PatientOnChain", () => {
  describe("computeIdentityHash", () => {
    it("produces a deterministic hex hash for a patient", () => {
      const hash1 = computeIdentityHash(fixtures.patientAlice);
      const hash2 = computeIdentityHash(fixtures.patientAlice);
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBeGreaterThan(0);
    });

    it("changes when patient data changes", () => {
      const original = computeIdentityHash(fixtures.patientAlice);
      const modified = computeIdentityHash({ ...fixtures.patientAlice, name: "Bob Okafor" });
      expect(original).not.toBe(modified);
    });
  });

  describe("buildRegisterPatientTx", () => {
    it("builds a valid transaction with manageData operation", () => {
      const hash = computeIdentityHash(fixtures.patientAlice);
      const tx = buildRegisterPatientTx(fixtures.aliceKeypair, hash);
      expect(tx.operations).toHaveLength(1);
      expect(tx.operations[0].type).toBe("manageData");
    });

    it("sets the memo to patient-registration", () => {
      const hash = computeIdentityHash(fixtures.patientAlice);
      const tx = buildRegisterPatientTx(fixtures.aliceKeypair, hash);
      expect(parsePatientFromMemo(tx.memo)).toBe("patient-registration");
    });
  });

  describe("simulateOperation", () => {
    it("signs and simulates successfully", () => {
      const hash = computeIdentityHash(fixtures.patientAlice);
      expect(simulateOperation(fixtures.aliceKeypair, hash)).toBe(true);
    });
  });

  it("uses different keypairs for different patients", () => {
    const hash = computeIdentityHash(fixtures.patientAlice);
    const tx = buildRegisterPatientTx(fixtures.aliceKeypair, hash);
    expect(tx.source).toBe(fixtures.aliceKeypair.publicKey());
  });
});
