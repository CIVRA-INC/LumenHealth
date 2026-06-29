import {
  Keypair,
  TransactionBuilder,
  Operation,
  BASE_FEE,
  Networks,
  Memo,
} from "@stellar/stellar-sdk";

export type ConsentServiceData = {
  patientId: string;
  consentType: string;
  status: string;
  scope: string;
  timestamp: string;
};

function serialize(data: ConsentServiceData): string {
  return `${data.patientId}|${data.consentType}|${data.status}|${data.scope}|${data.timestamp}`;
}

export function hashServiceConsent(data: ConsentServiceData): string {
  const bytes = new TextEncoder().encode(serialize(data));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function buildServiceConsentTx(
  source: Keypair,
  data: ConsentServiceData,
  network: string = Networks.TESTNET,
) {
  const h = hashServiceConsent(data);
  const key = `cns_svc_${data.patientId.slice(0, 8)}`;
  return new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: network })
    .addOperation(Operation.manageData({ source: source.publicKey(), name: key, value: h }))
    .addMemo(Memo.text("consent-svc"))
    .setTimeout(30)
    .build();
}

export function verifyServiceConsent(expected: ConsentServiceData, storedHash: string): boolean {
  return hashServiceConsent(expected) === storedHash;
}

export const fixtures = {
  source: Keypair.fromRawEd25519Seed(Buffer.alloc(32, 11)),
  data: { patientId: "pat_cns_svc_01", consentType: "data-sharing", status: "granted", scope: "share vitals", timestamp: "2026-06-15T10:00:00Z" } satisfies ConsentServiceData,
};
