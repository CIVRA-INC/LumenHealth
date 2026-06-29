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

export type ContractResponse<T> =
  | { status: "success"; data: T; code: number }
  | { status: "error"; message: string; code: number };

function buildPath(patientId: string): string {
  return `/api/v1/patients/${encodeURIComponent(patientId)}/demographics`;
}

export async function getDemographicsContract(
  baseUrl: string,
  patientId: string,
  clinicId: string,
): Promise<ContractResponse<DemographicsDTO>> {
  try {
    const res = await fetch(`${baseUrl}${buildPath(patientId)}`, {
      headers: { "x-clinic-id": clinicId },
    });
    const data = await res.json();
    if (!res.ok) return { status: "error", message: data.error || "Unknown error", code: res.status };
    return { status: "success", data: data as DemographicsDTO, code: res.status };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Network error", code: 0 };
  }
}

export async function createDemographicsContract(
  baseUrl: string,
  patientId: string,
  clinicId: string,
  body: Omit<DemographicsDTO, "id" | "patientId">,
): Promise<ContractResponse<DemographicsDTO>> {
  try {
    const res = await fetch(`${baseUrl}${buildPath(patientId)}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-clinic-id": clinicId },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return { status: "error", message: data.error || "Validation failed", code: res.status };
    return { status: "success", data: data as DemographicsDTO, code: res.status };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Network error", code: 0 };
  }
}

export async function updateDemographicsContract(
  baseUrl: string,
  patientId: string,
  clinicId: string,
  body: Partial<Omit<DemographicsDTO, "id" | "patientId">>,
): Promise<ContractResponse<DemographicsDTO>> {
  try {
    const res = await fetch(`${baseUrl}${buildPath(patientId)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-clinic-id": clinicId },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return { status: "error", message: data.error || "Update failed", code: res.status };
    return { status: "success", data: data as DemographicsDTO, code: res.status };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Network error", code: 0 };
  }
}

export async function deleteDemographicsContract(
  baseUrl: string,
  patientId: string,
  clinicId: string,
): Promise<ContractResponse<{ ok: boolean }>> {
  try {
    const res = await fetch(`${baseUrl}${buildPath(patientId)}`, {
      method: "DELETE",
      headers: { "x-clinic-id": clinicId },
    });
    const data = await res.json();
    if (!res.ok) return { status: "error", message: data.error || "Delete failed", code: res.status };
    return { status: "success", data: data as { ok: boolean }, code: res.status };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Network error", code: 0 };
  }
}
