export type ConsentRecord = {
  id: string;
  consentType: string;
  status: string;
  scope: string;
  grantedAt: string;
  expiresAt: string | null;
};

export type ConsentServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const API_BASE = "/api/v1";

export function createWebConsentService(baseUrl: string) {
  const api = baseUrl || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  async function request<T>(method: string, patientId: string, clinicId: string, body?: unknown): Promise<ConsentServiceResult<T>> {
    try {
      const res = await fetch(`${api}${API_BASE}/patients/${patientId}/consent`, {
        method,
        headers: { "content-type": "application/json", "x-clinic-id": clinicId },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || `HTTP ${res.status}` };
      return { ok: true, data: data as T };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Network error" };
    }
  }

  function grant(patientId: string, clinicId: string, payload: { consentType: string; scope: string; expiresAt?: string }) {
    return request<ConsentRecord>("POST", patientId, clinicId, payload);
  }

  function revoke(patientId: string, clinicId: string, consentId: string) {
    return request<ConsentRecord>("POST", patientId, clinicId, { action: "revoke", consentId });
  }

  function listActive(patientId: string, clinicId: string) {
    return request<ConsentRecord[]>("GET", patientId, clinicId);
  }

  return { grant, revoke, listActive };
}
