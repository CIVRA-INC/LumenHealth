import { getPublicRuntimeConfig } from "@lumen/config/public";
import type { Clinic, UpdateClinicRequest } from "@lumen/types";

function headers(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchClinic(clinicId: string, token: string): Promise<Clinic> {
  const { apiBaseUrl } = getPublicRuntimeConfig();
  const res = await fetch(`${apiBaseUrl}/api/v1/clinics/${clinicId}`, {
    headers: headers(token),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `Failed to fetch clinic (${res.status})`);
  }

  const body = await res.json();
  return (body as { clinic: Clinic }).clinic;
}

export async function updateClinic(
  clinicId: string,
  data: UpdateClinicRequest,
  token: string,
): Promise<Clinic> {
  const { apiBaseUrl } = getPublicRuntimeConfig();
  const res = await fetch(`${apiBaseUrl}/api/v1/clinics/${clinicId}`, {
    method: "PATCH",
    headers: headers(token),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `Failed to update clinic (${res.status})`);
  }

  const body = await res.json();
  return (body as { clinic: Clinic }).clinic;
}
