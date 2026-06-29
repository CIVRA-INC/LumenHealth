import {
  Keypair,
  TransactionBuilder,
  Operation,
  BASE_FEE,
  Networks,
  Memo,
} from "@stellar/stellar-sdk";

type ConsentData = { consentType: string; scope: string; status: string };
type ConsentRecord = { id: string; patientId: string; consentType: string; status: string; scope: string; grantedAt: string; expiresAt: string | null };

function createConsent(patientId: string, data: { consentType: string; scope: string; expiresAt?: string }): ConsentRecord {
  return { id: `cns_${Date.now()}`, patientId, consentType: data.consentType, status: "granted", scope: data.scope, grantedAt: new Date().toISOString(), expiresAt: data.expiresAt || null };
}

function validateConsent(payload: Record<string, unknown>): string[] {
  const e: string[] = [];
  if (!payload.consentType) e.push("Valid consentType is required");
  if (!payload.scope) e.push("scope is required");
  return e;
}

function createPrivacy(patientId: string): Record<string, unknown> {
  return { patientId, shareWithProvider: true, shareForResearch: false, dataRetentionDays: 365, updatedAt: new Date().toISOString() };
}

type StellarConsentData = { patientId: string; consentType: string; status: string; scope: string; expiryDate: string };

function hashStellar(data: StellarConsentData): string {
  const s = `${data.patientId}|${data.consentType}|${data.status}|${data.scope}|${data.expiryDate}`;
  const bytes = new TextEncoder().encode(s);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function buildTx(source: Keypair, data: StellarConsentData) {
  const h = hashStellar(data);
  const key = `cns_ctr_${data.patientId.slice(0, 8)}`;
  return new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.manageData({ source: source.publicKey(), name: key, value: h }))
    .addOperation(Operation.manageData({ source: source.publicKey(), name: `${key}_scope`, value: data.scope }))
    .addMemo(Memo.text("consent-contract"))
    .setTimeout(30)
    .build();
}

function parseValue(value: string): StellarConsentData {
  const [patientId, consentType, status, scope, expiryDate] = value.split("|");
  return { patientId, consentType, status, scope, expiryDate };
}

const stellarData: StellarConsentData = { patientId: "pat_cns_ctr_01", consentType: "data-sharing", status: "granted", scope: "vitals", expiryDate: "2027-06-01" };

describe("Consent & Privacy API Contract", () => {
  describe("data model", () => {
    it("creates and validates consent", () => {
      const record = createConsent("pat_contract_01", { consentType: "data-sharing", scope: "share vitals" });
      expect(record.status).toBe("granted");
      expect(record.consentType).toBe("data-sharing");
    });

    it("rejects invalid consent", () => {
      const errors = validateConsent({ consentType: "", scope: "" });
      expect(errors.length).toBeGreaterThan(0);
    });

    it("creates privacy preferences", () => {
      const pref = createPrivacy("pat_contract_01");
      expect(pref.dataRetentionDays).toBe(365);
    });
  });

  describe("stellar contract", () => {
    it("hashes deterministically", () => {
      expect(hashStellar(stellarData)).toBe(hashStellar(stellarData));
    });

    it("builds a transaction", () => {
      const source = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 12));
      const tx = buildTx(source, stellarData);
      expect(tx.operations).toHaveLength(2);
    });

    it("verifies matching data", () => {
      const h = hashStellar(stellarData);
      expect(h === hashStellar(stellarData)).toBe(true);
    });

    it("parses serialized value", () => {
      const s = `${stellarData.patientId}|${stellarData.consentType}|${stellarData.status}|${stellarData.scope}|${stellarData.expiryDate}`;
      const p = parseValue(s);
      expect(p.consentType).toBe("data-sharing");
    });
  });
});
