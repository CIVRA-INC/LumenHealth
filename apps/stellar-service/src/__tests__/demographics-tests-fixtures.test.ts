import {
  Keypair,
  TransactionBuilder,
  Operation,
  BASE_FEE,
  Networks,
  Memo,
} from "@stellar/stellar-sdk";

type DemographicsData = {
  dateOfBirth: string;
  gender: string;
  bloodGroup?: string;
  nationality?: string;
};

function serialize(d: DemographicsData): string {
  return [d.dateOfBirth, d.gender, d.bloodGroup || "", d.nationality || ""].join("|");
}

function hashData(data: DemographicsData): string {
  const bytes = new TextEncoder().encode(serialize(data));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function buildTx(source: Keypair, patientId: string, data: DemographicsData) {
  const h = hashData(data);
  const key = `demo_tf_${patientId.slice(0, 8)}`;
  return new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.manageData({ source: source.publicKey(), name: key, value: h }))
    .addOperation(Operation.manageData({ source: source.publicKey(), name: `${key}_dob`, value: data.dateOfBirth }))
    .addMemo(Memo.text("demographics-tf"))
    .setTimeout(30)
    .build();
}

function verify(expected: DemographicsData, storedHash: string): boolean {
  return hashData(expected) === storedHash;
}

function parseValue(value: string): DemographicsData {
  const [dateOfBirth, gender, bloodGroup, nationality] = value.split("|");
  return { dateOfBirth, gender, bloodGroup: bloodGroup || undefined, nationality: nationality || undefined };
}

const fixtures = {
  alice: Keypair.fromRawEd25519Seed(Buffer.alloc(32, 3)),
  data: { dateOfBirth: "1995-11-30", gender: "female", bloodGroup: "B+", nationality: "Nigerian" } satisfies DemographicsData,
  patientId: "pat_tf_01",
};

describe("Demographics Stellar — Tests & Fixtures", () => {
  describe("hashData", () => {
    it("produces deterministic hash", () => {
      const h1 = hashData(fixtures.data);
      const h2 = hashData(fixtures.data);
      expect(h1).toBe(h2);
    });

    it("changes when input changes", () => {
      const h1 = hashData(fixtures.data);
      const h2 = hashData({ ...fixtures.data, gender: "male" });
      expect(h1).not.toBe(h2);
    });
  });

  describe("buildTx", () => {
    it("builds a transaction with manageData operations", () => {
      const tx = buildTx(fixtures.alice, fixtures.patientId, fixtures.data);
      expect(tx.operations).toHaveLength(2);
      expect(tx.operations[0].type).toBe("manageData");
    });

    it("sets memo to demographics-tf", () => {
      const tx = buildTx(fixtures.alice, fixtures.patientId, fixtures.data);
      expect(tx.memo.value).toBe("demographics-tf");
    });
  });

  describe("verify", () => {
    it("verifies matching data", () => {
      const h = hashData(fixtures.data);
      expect(verify(fixtures.data, h)).toBe(true);
    });

    it("rejects mismatched data", () => {
      const h = hashData(fixtures.data);
      expect(verify({ ...fixtures.data, dateOfBirth: "2000-01-01" }, h)).toBe(false);
    });
  });

  describe("parseValue", () => {
    it("parses back original data", () => {
      const serialized = serialize(fixtures.data);
      const parsed = parseValue(serialized);
      expect(parsed.dateOfBirth).toBe("1995-11-30");
      expect(parsed.gender).toBe("female");
      expect(parsed.bloodGroup).toBe("B+");
    });
  });
});
