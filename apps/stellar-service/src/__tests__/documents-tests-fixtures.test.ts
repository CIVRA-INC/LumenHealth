import {
  Keypair,
  TransactionBuilder,
  Operation,
  BASE_FEE,
  Networks,
  Memo,
} from "@stellar/stellar-sdk";

type DocumentData = {
  documentId: string;
  patientId: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  category: string;
  fileHash: string;
};

function serialize(d: DocumentData): string {
  return [d.documentId, d.patientId, d.fileName, d.fileType, String(d.fileSizeBytes), d.category, d.fileHash].join("|");
}

function hashData(data: DocumentData): string {
  const bytes = new TextEncoder().encode(serialize(data));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function buildTx(source: Keypair, data: DocumentData) {
  const h = hashData(data);
  const key = `doc_tf_${data.documentId.slice(0, 8)}`;
  return new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.manageData({ source: source.publicKey(), name: key, value: h }))
    .addOperation(Operation.manageData({ source: source.publicKey(), name: `${key}_meta`, value: `${data.fileName}|${data.category}` }))
    .addMemo(Memo.text("documents-tf"))
    .setTimeout(30)
    .build();
}

function verify(expected: DocumentData, storedHash: string): boolean {
  return hashData(expected) === storedHash;
}

function parseValue(value: string): DocumentData {
  const [documentId, patientId, fileName, fileType, fileSizeBytes, category, fileHash] = value.split("|");
  return { documentId, patientId, fileName, fileType, fileSizeBytes: Number(fileSizeBytes), category, fileHash };
}

const fixtures = {
  source: Keypair.fromRawEd25519Seed(Buffer.alloc(32, 7)),
  data: {
    documentId: "doc_tf_01",
    patientId: "pat_tf_01",
    fileName: "xray.dcm",
    fileType: "application/dicom",
    fileSizeBytes: 4194304,
    category: "imaging",
    fileHash: "aabbccddee",
  } satisfies DocumentData,
  modified: {
    documentId: "doc_tf_01",
    patientId: "pat_tf_01",
    fileName: "xray-v2.dcm",
    fileType: "application/dicom",
    fileSizeBytes: 4194304,
    category: "imaging",
    fileHash: "aabbccddee",
  } satisfies DocumentData,
};

describe("Documents Stellar — Tests & Fixtures", () => {
  describe("hashData", () => {
    it("produces deterministic hash", () => {
      const h1 = hashData(fixtures.data);
      const h2 = hashData(fixtures.data);
      expect(h1).toBe(h2);
    });

    it("changes when input changes", () => {
      const h1 = hashData(fixtures.data);
      const h2 = hashData(fixtures.modified);
      expect(h1).not.toBe(h2);
    });
  });

  describe("buildTx", () => {
    it("builds a transaction with manageData operations", () => {
      const tx = buildTx(fixtures.source, fixtures.data);
      expect(tx.operations).toHaveLength(2);
      expect(tx.operations[0].type).toBe("manageData");
    });

    it("sets memo to documents-tf", () => {
      const tx = buildTx(fixtures.source, fixtures.data);
      expect(tx.memo.value).toBe("documents-tf");
    });
  });

  describe("verify", () => {
    it("verifies matching data", () => {
      const h = hashData(fixtures.data);
      expect(verify(fixtures.data, h)).toBe(true);
    });

    it("rejects mismatched data", () => {
      const h = hashData(fixtures.data);
      expect(verify(fixtures.modified, h)).toBe(false);
    });
  });

  describe("parseValue", () => {
    it("parses back original data", () => {
      const serialized = serialize(fixtures.data);
      const parsed = parseValue(serialized);
      expect(parsed.fileName).toBe("xray.dcm");
      expect(parsed.category).toBe("imaging");
      expect(parsed.fileSizeBytes).toBe(4194304);
    });
  });
});
