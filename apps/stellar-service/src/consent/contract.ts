import {
  Keypair,
  TransactionBuilder,
  Operation,
  BASE_FEE,
  Networks,
  Memo,
} from "@stellar/stellar-sdk";

export type ConsentContractData = {
  patientId: string;
  consentType: string;
  status: string;
  scope: string;
  expiryDate: string;
};

function serializeContract(data: ConsentContractData): string {
  return `${data.patientId}|${data.consentType}|${data.status}|${data.scope}|${data.expiryDate}`;
}

export function hashConsentContract(data: ConsentContractData): string {
  const bytes = new TextEncoder().encode(serializeContract(data));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function buildContractTx(
  source: Keypair,
  data: ConsentContractData,
  network: string = Networks.TESTNET,
) {
  const h = hashConsentContract(data);
  const key = `cns_ctr_${data.patientId.slice(0, 8)}`;
  return new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: network })
    .addOperation(Operation.manageData({ source: source.publicKey(), name: key, value: h }))
    .addOperation(Operation.manageData({ source: source.publicKey(), name: `${key}_scope`, value: data.scope }))
    .addMemo(Memo.text("consent-contract"))
    .setTimeout(30)
    .build();
}

export function verifyConsentContract(expected: ConsentContractData, storedHash: string): boolean {
  return hashConsentContract(expected) === storedHash;
}

export function parseContractValue(value: string): ConsentContractData {
  const [patientId, consentType, status, scope, expiryDate] = value.split("|");
  return { patientId, consentType, status, scope, expiryDate };
}

export const fixtures = {
  source: Keypair.fromRawEd25519Seed(Buffer.alloc(32, 12)),
  data: { patientId: "pat_cns_ctr_01", consentType: "data-sharing", status: "granted", scope: "vitals and demographics", expiryDate: "2027-06-01" } satisfies ConsentContractData,
};
