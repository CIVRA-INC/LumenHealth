import {
  Keypair,
  TransactionBuilder,
  Operation,
  BASE_FEE,
  Networks,
  Memo,
} from "@stellar/stellar-sdk";

export type ConsentData = {
  patientId: string;
  consentType: string;
  status: string;
  grantedAt: string;
  expiresAt: string;
};

function serialize(data: ConsentData): string {
  return `${data.patientId}|${data.consentType}|${data.status}|${data.grantedAt}|${data.expiresAt}`;
}

export function hashConsent(data: ConsentData): string {
  const bytes = new TextEncoder().encode(serialize(data));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function buildConsentTx(
  source: Keypair,
  data: ConsentData,
  network: string = Networks.TESTNET,
) {
  const h = hashConsent(data);
  const key = `cns_${data.patientId.slice(0, 8)}`;
  return new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: network })
    .addOperation(Operation.manageData({ source: source.publicKey(), name: key, value: h }))
    .addOperation(Operation.manageData({ source: source.publicKey(), name: `${key}_type`, value: data.consentType }))
    .addMemo(Memo.text("consent-model"))
    .setTimeout(30)
    .build();
}

export function verifyConsent(expected: ConsentData, storedHash: string): boolean {
  return hashConsent(expected) === storedHash;
}

export function parseConsentValue(value: string): ConsentData {
  const [patientId, consentType, status, grantedAt, expiresAt] = value.split("|");
  return { patientId, consentType, status, grantedAt, expiresAt };
}

export const fixtures = {
  source: Keypair.fromRawEd25519Seed(Buffer.alloc(32, 10)),
  data: { patientId: "pat_cns_st_01", consentType: "data-sharing", status: "granted", grantedAt: "2026-06-01T00:00:00Z", expiresAt: "2027-06-01T00:00:00Z" } satisfies ConsentData,
};
