import { getPublicRuntimeConfig } from "@lumen/config/public";

function headers(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export type PatientSummary = {
  patientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  bloodType?: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phoneNumber: string;
  };
  lastVisitAt?: string;
  clinicId: string;
  createdAt: string;
  updatedAt: string;
};

export type PatientListResponse = {
  patients: PatientSummary[];
  total: number;
};

export async function fetchPatients(token: string): Promise<PatientListResponse> {
  const { apiBaseUrl } = getPublicRuntimeConfig();
  const res = await fetch(`${apiBaseUrl}/api/v1/patients`, {
    headers: headers(token),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string }).message ??
        `Failed to fetch patients (${res.status})`,
    );
  }

  return (await res.json()) as PatientListResponse;
}

export async function fetchPatient(
  patientId: string,
  token: string,
): Promise<PatientSummary> {
  const { apiBaseUrl } = getPublicRuntimeConfig();
  const res = await fetch(`${apiBaseUrl}/api/v1/patients/${patientId}`, {
    headers: headers(token),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string }).message ??
        `Failed to fetch patient (${res.status})`,
    );
  }

  const data = (await res.json()) as { patient: PatientSummary };
  return data.patient;
}

export type UpdateDemographicsPayload = {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodType?: string;
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phoneNumber?: string;
  };
};

export async function updatePatientDemographics(
  patientId: string,
  payload: UpdateDemographicsPayload,
  token: string,
): Promise<PatientSummary> {
  const { apiBaseUrl } = getPublicRuntimeConfig();
  const res = await fetch(`${apiBaseUrl}/api/v1/patients/${patientId}`, {
    method: "PATCH",
    headers: headers(token),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string }).message ??
        `Failed to update patient demographics (${res.status})`,
    );
  }

  const data = (await res.json()) as { patient: PatientSummary };
  return data.patient;
}
