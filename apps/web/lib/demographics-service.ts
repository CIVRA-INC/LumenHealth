export type DemographicsData = {
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

export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string };

const BASE = "/api/v1";

export function createDemographicsApi(baseUrl: string = "") {
  const apiUrl = baseUrl || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  async function fetchDemographics(patientId: string, clinicId: string): Promise<ApiResponse<DemographicsData>> {
    try {
      const res = await fetch(`${apiUrl}${BASE}/patients/${patientId}/demographics`, {
        headers: { "x-clinic-id": clinicId },
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      return { ok: true, data: await res.json() };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
    }
  }

  async function createDemographics(
    patientId: string,
    clinicId: string,
    data: DemographicsData,
  ): Promise<ApiResponse<DemographicsData>> {
    try {
      const res = await fetch(`${apiUrl}${BASE}/patients/${patientId}/demographics`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-clinic-id": clinicId },
        body: JSON.stringify(data),
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      return { ok: true, data: await res.json() };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
    }
  }

  async function updateDemographics(
    patientId: string,
    clinicId: string,
    data: Partial<DemographicsData>,
  ): Promise<ApiResponse<DemographicsData>> {
    try {
      const res = await fetch(`${apiUrl}${BASE}/patients/${patientId}/demographics`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-clinic-id": clinicId },
        body: JSON.stringify(data),
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      return { ok: true, data: await res.json() };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
    }
  }

  async function deleteDemographics(patientId: string, clinicId: string): Promise<ApiResponse<boolean>> {
    try {
      const res = await fetch(`${apiUrl}${BASE}/patients/${patientId}/demographics`, {
        method: "DELETE",
        headers: { "x-clinic-id": clinicId },
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      return { ok: true, data: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
    }
  }

  return { fetchDemographics, createDemographics, updateDemographics, deleteDemographics };
}
