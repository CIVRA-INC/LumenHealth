export type DemographicsDTO = {
  id: string;
  patientId: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus?: string;
  bloodGroup?: string;
  occupation?: string;
  nationality?: string;
  primaryLanguage?: string;
  address: { street: string; city: string; state: string; postalCode: string; country: string };
  emergencyContact: { name: string; relationship: string; phone: string; email?: string };
  createdAt: string;
  updatedAt: string;
};

export type CreateDemographicsBody = Omit<DemographicsDTO, "id" | "patientId" | "createdAt" | "updatedAt">;

export type UpdateDemographicsBody = Partial<CreateDemographicsBody>;

export type ContractResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: string; status: number };

const BASE_PATH = "/api/v1";

export function demographicsContract(baseUrl: string) {
  const api = baseUrl.replace(/\/+$/, "");

  async function request<T>(
    method: string,
    patientId: string,
    clinicId: string,
    body?: unknown,
  ): Promise<ContractResult<T>> {
    try {
      const res = await fetch(`${api}${BASE_PATH}/patients/${encodeURIComponent(patientId)}/demographics`, {
        method,
        headers: {
          "content-type": "application/json",
          "x-clinic-id": clinicId,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || `HTTP ${res.status}`, status: res.status };
      return { ok: true, data: data as T, status: res.status };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Network error", status: 0 };
    }
  }

  return {
    get(patientId: string, clinicId: string) {
      return request<DemographicsDTO>("GET", patientId, clinicId);
    },
    create(patientId: string, clinicId: string, body: CreateDemographicsBody) {
      return request<DemographicsDTO>("POST", patientId, clinicId, body);
    },
    update(patientId: string, clinicId: string, body: UpdateDemographicsBody) {
      return request<DemographicsDTO>("PATCH", patientId, clinicId, body);
    },
    remove(patientId: string, clinicId: string) {
      return request<{ ok: boolean }>("DELETE", patientId, clinicId);
    },
  };
}
