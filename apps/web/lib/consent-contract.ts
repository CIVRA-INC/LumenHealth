export type ConsentDTO = {
  id: string;
  consentType: string;
  status: string;
  scope: string;
  grantedAt: string;
};

export type ContractClientResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const API_PATH = "/api/v1/patients";

export function createWebConsentContract(baseUrl: string) {
  const api = baseUrl || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  async function request<T>(method: string, patientId: string, clinicId: string, body?: unknown): Promise<ContractClientResult<T>> {
    try {
      const res = await fetch(`${api}${API_PATH}/${encodeURIComponent(patientId)}/consent`, {
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

  function grant(patientId: string, clinicId: string, payload: { consentType: string; scope: string }) {
    return request<ConsentDTO>("POST", patientId, clinicId, payload);
  }

  function list(patientId: string, clinicId: string) {
    return request<ConsentDTO[]>("GET", patientId, clinicId);
  }

  return { grant, list };
}
