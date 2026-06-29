import {
  Keypair,
  TransactionBuilder,
  Operation,
  BASE_FEE,
  Networks,
  Memo,
} from "@stellar/stellar-sdk";

export type DocumentContractData = {
  documentId: string;
  patientId: string;
  fileName: string;
  category: string;
  fileHash: string;
};

export type ContractOperation = {
  type: "store" | "verify" | "remove";
  documentId: string;
  patientId: string;
};

function encodeData(data: DocumentContractData): string {
  return `${data.documentId}|${data.patientId}|${data.fileName}|${data.category}|${data.fileHash}`;
}

export function hashDocument(data: DocumentContractData): string {
  const bytes = new TextEncoder().encode(encodeData(data));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function buildDocStoreOp(source: Keypair, data: DocumentContractData) {
  const h = hashDocument(data);
  return Operation.manageData({
    source: source.publicKey(),
    name: `doc_contract_${data.documentId.slice(0, 8)}`,
    value: h,
  });
}

export function buildDocRemoveOp(source: Keypair, documentId: string) {
  return Operation.manageData({
    source: source.publicKey(),
    name: `doc_contract_${documentId.slice(0, 8)}`,
    value: null,
  });
}

export function buildDocContractTx(
  source: Keypair,
  ops: ReturnType<typeof Operation.manageData>[],
  network: string = Networks.TESTNET,
) {
  return new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: network })
    .addOperation(...ops)
    .addMemo(Memo.text("documents-contract"))
    .setTimeout(30)
    .build();
}

export function verifyDocContractData(expected: DocumentContractData, onChainHash: string): boolean {
  return hashDocument(expected) === onChainHash;
}

export function parseDocContractValue(value: string): DocumentContractData {
  const [documentId, patientId, fileName, category, fileHash] = value.split("|");
  return { documentId, patientId, fileName, category, fileHash };
}
