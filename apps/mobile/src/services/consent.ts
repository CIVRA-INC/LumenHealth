export type ConsentRecord = {
  id: string;
  consentType: string;
  status: string;
  scope: string;
  grantedAt: string;
  expiresAt: string | null;
};

export type MobileServiceResult<T> =
  | { type: "success"; data: T }
  | { type: "error"; message: string };

const BASE_PATH = "/api/v1/patients";

export function createMobileConsentService(baseUrl: string) {
  async function request<T>(method: string, patientId: string, clinicId: string, body?: unknown): Promise<MobileServiceResult<T>> {
    try {
      const res = await fetch(`${baseUrl}${BASE_PATH}/${encodeURIComponent(patientId)}/consent`, {
        method,
        headers: { "content-type": "application/json", "x-clinic-id": clinicId },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) return { type: "error", message: data.error || `HTTP ${res.status}` };
      return { type: "success", data: data as T };
    } catch (e) {
      return { type: "error", message: e instanceof Error ? e.message : "Network error" };
    }
  }

  function grant(patientId: string, payload: { consentType: string; scope: string; expiresAt?: string }) {
    return request<ConsentRecord>("POST", patientId, "default", payload);
  }

  function revoke(patientId: string, consentId: string) {
    return request<ConsentRecord>("POST", patientId, "default", { action: "revoke", consentId });
  }

  function getActive(patientId: string) {
    return request<ConsentRecord[]>("GET", patientId, "default");
  }

  return { grant, revoke, getActive };
}
