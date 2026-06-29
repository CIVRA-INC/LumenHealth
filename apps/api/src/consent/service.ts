export type ConsentStatus = "granted" | "revoked" | "expired";

export type ConsentRecord = {
  id: string;
  patientId: string;
  clinicId: string;
  consentType: string;
  status: ConsentStatus;
  grantedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  scope: string;
  notes: string;
};

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; error: string };

const store = new Map<string, ConsentRecord[]>();
let counter = 0;

function ensure(pid: string): ConsentRecord[] {
  if (!store.has(pid)) store.set(pid, []);
  return store.get(pid)!;
}

export function createConsentService() {
  function grant(patientId: string, clinicId: string, data: { consentType: string; scope: string; expiresAt?: string; notes?: string }): ServiceResult<ConsentRecord> {
    if (!data.consentType || !data.scope) return { ok: false, error: "consentType and scope required" };
    counter++;
    const record: ConsentRecord = {
      id: `cns_svc_${counter}`,
      patientId,
      clinicId,
      consentType: data.consentType,
      status: "granted",
      grantedAt: new Date().toISOString(),
      expiresAt: data.expiresAt || null,
      revokedAt: null,
      scope: data.scope,
      notes: data.notes || "",
    };
    ensure(patientId).push(record);
    return { ok: true, data: record };
  }

  function revoke(patientId: string, consentId: string): ServiceResult<ConsentRecord> {
    const entries = ensure(patientId);
    const record = entries.find((e) => e.id === consentId);
    if (!record) return { ok: false, error: "NOT_FOUND" };
    if (record.status !== "granted") return { ok: false, error: "CANNOT_REVOKE" };
    record.status = "revoked";
    record.revokedAt = new Date().toISOString();
    return { ok: true, data: record };
  }

  function listActive(patientId: string): ServiceResult<ConsentRecord[]> {
    const entries = ensure(patientId);
    const active = entries.filter((e) => {
      if (e.status !== "granted") return false;
      if (e.expiresAt && new Date(e.expiresAt) < new Date()) return false;
      return true;
    });
    return { ok: true, data: active };
  }

  function getHistory(patientId: string): ServiceResult<ConsentRecord[]> {
    const entries = store.get(patientId);
    if (!entries || entries.length === 0) return { ok: false, error: "NOT_FOUND" };
    return { ok: true, data: [...entries].sort((a, b) => b.grantedAt.localeCompare(a.grantedAt)) };
  }

  function reset() { store.clear(); counter = 0; }

  return { grant, revoke, listActive, getHistory, reset };
}

export const fixtures = {
  validGrant: { consentType: "data-sharing", scope: "share vitals with provider", notes: "Standard" },
  patientId: "pat_svc_cns_01",
  clinicId: "clinic_svc_01",
};
