import { getPublicRuntimeConfig } from "@lumen/config/public";
import type { Clinic, UpdateClinicRequest } from "@lumen/types";
import { authHeaders, jsonHeaders, pathSegment, type RequestOptions } from "../../lib/http";

export async function fetchClinic(clinicId: string, token: string, options: RequestOptions = {}): Promise<Clinic> {
  const { apiBaseUrl } = getPublicRuntimeConfig();
  const res = await fetch(`${apiBaseUrl}/api/v1/clinics/${pathSegment(clinicId)}`, {
    headers: authHeaders(token),
    signal: options.signal,
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
  options: RequestOptions = {},
): Promise<Clinic> {
  const { apiBaseUrl } = getPublicRuntimeConfig();
  const res = await fetch(`${apiBaseUrl}/api/v1/clinics/${pathSegment(clinicId)}`, {
    method: "PATCH",
    headers: jsonHeaders(token),
    body: JSON.stringify(data),
    signal: options.signal,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `Failed to update clinic (${res.status})`);
  }

  const body = await res.json();
  return (body as { clinic: Clinic }).clinic;
}
