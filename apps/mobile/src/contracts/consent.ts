export type ConsentDTO = {
  id: string;
  consentType: string;
  status: string;
  scope: string;
  grantedAt: string;
  expiresAt: string | null;
};

export type MobileContractResult<T> =
  | { status: "ok"; data: T }
  | { status: "error"; message: string };

const BASE_PATH = "/api/v1/patients";

export function createMobileConsentContract(baseUrl: string) {
  async function request<T>(method: string, path: string, body?: unknown, clinicId = "default"): Promise<MobileContractResult<T>> {
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers: { "content-type": "application/json", "x-clinic-id": clinicId },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) return { status: "error", message: data.error || `HTTP ${res.status}` };
      return { status: "ok", data: data as T };
    } catch (e) {
      return { status: "error", message: e instanceof Error ? e.message : "Request failed" };
    }
  }

  function grant(patientId: string, payload: { consentType: string; scope: string; expiresAt?: string }) {
    return request<ConsentDTO>("POST", `${BASE_PATH}/${encodeURIComponent(patientId)}/consent`, payload);
  }

  function list(patientId: string) {
    return request<ConsentDTO[]>("GET", `${BASE_PATH}/${encodeURIComponent(patientId)}/consent`);
  }

  function revoke(patientId: string, consentId: string) {
    return request<ConsentDTO>("POST", `${BASE_PATH}/${encodeURIComponent(patientId)}/consent/revoke`, { consentId });
  }

  return { grant, list, revoke };
}
