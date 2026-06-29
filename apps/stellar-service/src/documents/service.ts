import {
  Keypair,
  TransactionBuilder,
  Operation,
  BASE_FEE,
  Networks,
  Memo,
} from "@stellar/stellar-sdk";

export type StellarDocumentData = {
  documentId: string;
  patientId: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  category: string;
  fileHash: string;
};

export type StellarDocumentResult = {
  hash: string;
  transactionXdr: string;
};

function serializeDocument(data: StellarDocumentData): string {
  return [
    data.documentId,
    data.patientId,
    data.fileName,
    data.fileType,
    String(data.fileSizeBytes),
    data.category,
    data.fileHash,
  ].join("|");
}

export function computeDocumentHash(data: StellarDocumentData): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(serializeDocument(data));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function buildStoreDocumentTx(
  source: Keypair,
  data: StellarDocumentData,
  network: string = Networks.TESTNET,
) {
  const hash = computeDocumentHash(data);
  const keyName = `doc_${data.documentId.slice(0, 8)}`;

  return new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: network,
  })
    .addOperation(
      Operation.manageData({
        source: source.publicKey(),
        name: keyName,
        value: hash,
      }),
    )
    .addOperation(
      Operation.manageData({
        source: source.publicKey(),
        name: `${keyName}_meta`,
        value: `${data.fileName}|${data.category}|${data.fileType}`,
      }),
    )
    .addMemo(Memo.text("documents"))
    .setTimeout(30)
    .build();
}

export async function submitDocumentToStellar(
  source: Keypair,
  data: StellarDocumentData,
  serverUrl: string = "https://horizon-testnet.stellar.org",
): Promise<StellarDocumentResult> {
  const tx = buildStoreDocumentTx(source, data);
  tx.sign(source);
  return {
    hash: computeDocumentHash(data),
    transactionXdr: tx.toXDR(),
  };
}

export function decodeDocumentValue(value: string): string[] {
  return value.split("|");
}

export function verifyDocumentOnChain(
  expected: StellarDocumentData,
  storedHash: string,
): boolean {
  const computed = computeDocumentHash(expected);
  return computed === storedHash;
}
