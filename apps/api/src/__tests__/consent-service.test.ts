export type ConsentStatus = "granted" | "revoked" | "expired";

export type ConsentRecord = {
  id: string;
  patientId: string;
  consentType: string;
  status: ConsentStatus;
  scope: string;
  grantedAt: string;
  expiresAt: string | null;
};

export type GrantConsentInput = {
  consentType: string;
  scope: string;
  expiresAt?: string;
  notes?: string;
};

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; error: string };

let records: ConsentRecord[] = [];
let counter = 0;

function ts(): string {
  return new Date().toISOString();
}

export const consentApi = {
  grant(patientId: string, input: GrantConsentInput): ServiceResult<ConsentRecord> {
    if (!input.consentType || !input.scope) return { ok: false, error: "consentType and scope required" };
    counter++;
    const record: ConsentRecord = {
      id: `cns_ct_${counter}`,
      patientId,
      consentType: input.consentType,
      status: "granted",
      scope: input.scope,
      grantedAt: ts(),
      expiresAt: input.expiresAt || null,
    };
    records.push(record);
    return { ok: true, data: record };
  },

  list(patientId: string): ServiceResult<ConsentRecord[]> {
    const filtered = records.filter((r) => r.patientId === patientId);
    return { ok: true, data: filtered };
  },

  revoke(patientId: string, consentId: string): ServiceResult<ConsentRecord> {
    const record = records.find((r) => r.id === consentId && r.patientId === patientId);
    if (!record) return { ok: false, error: "NOT_FOUND" };
    record.status = "revoked";
    return { ok: true, data: record };
  },

  reset() { records = []; counter = 0; },
};

describe("Consent Service", () => {
  beforeEach(() => consentApi.reset());

  it("grants consent", () => {
    const result = consentApi.grant("pat_ct_01", { consentType: "data-sharing", scope: "vitals" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe("granted");
      expect(result.data.patientId).toBe("pat_ct_01");
    }
  });

  it("rejects without consentType", () => {
    const result = consentApi.grant("pat_ct_01", { consentType: "", scope: "" });
    expect(result.ok).toBe(false);
  });

  it("lists consent records", () => {
    consentApi.grant("pat_ct_01", { consentType: "data-sharing", scope: "vitals" });
    consentApi.grant("pat_ct_01", { consentType: "research", scope: "anonymized" });
    const result = consentApi.list("pat_ct_01");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toHaveLength(2);
  });

  it("revokes consent", () => {
    const granted = consentApi.grant("pat_ct_01", { consentType: "marketing", scope: "email" });
    if (!granted.ok) throw new Error("setup failed");
    const revoked = consentApi.revoke("pat_ct_01", granted.data.id);
    expect(revoked.ok).toBe(true);
    if (revoked.ok) expect(revoked.data.status).toBe("revoked");
  });

  it("returns error for unknown consent on revoke", () => {
    const result = consentApi.revoke("pat_ct_01", "nonexistent");
    expect(result.ok).toBe(false);
  });
});
