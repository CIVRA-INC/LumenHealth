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
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  };
};

export type ServiceResult<T> = { type: "success"; data: T } | { type: "error"; message: string };

const API_BASE = "/api/v1";

export function createMobileDemographicsService(baseUrl: string) {
  async function request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<ServiceResult<T>> {
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers as Record<string, string>),
        },
      });
      if (!res.ok) return { type: "error", message: `HTTP ${res.status}: ${res.statusText}` };
      return { type: "success", data: await res.json() };
    } catch (e) {
      return { type: "error", message: e instanceof Error ? e.message : "Network error" };
    }
  }

  function getDemographics(patientId: string, clinicId: string) {
    return request<DemographicsDTO>(
      `${API_BASE}/patients/${patientId}/demographics`,
      { headers: { "x-clinic-id": clinicId } },
    );
  }

  function createDemographics(patientId: string, clinicId: string, data: Omit<DemographicsDTO, "id" | "patientId">) {
    return request<DemographicsDTO>(
      `${API_BASE}/patients/${patientId}/demographics`,
      {
        method: "POST",
        headers: { "x-clinic-id": clinicId },
        body: JSON.stringify(data),
      },
    );
  }

  function updateDemographics(patientId: string, clinicId: string, data: Partial<Omit<DemographicsDTO, "id" | "patientId">>) {
    return request<DemographicsDTO>(
      `${API_BASE}/patients/${patientId}/demographics`,
      {
        method: "PATCH",
        headers: { "x-clinic-id": clinicId },
        body: JSON.stringify(data),
      },
    );
  }

  function deleteDemographics(patientId: string, clinicId: string) {
    return request<{ ok: boolean }>(
      `${API_BASE}/patients/${patientId}/demographics`,
      {
        method: "DELETE",
        headers: { "x-clinic-id": clinicId },
      },
    );
  }

  return { getDemographics, createDemographics, updateDemographics, deleteDemographics };
}
