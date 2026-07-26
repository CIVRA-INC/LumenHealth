import type { PatientDemographicRecord } from '@qyou/shared';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function fetchDemographics(patientId: string): Promise<PatientDemographicRecord> {
  const res = await fetch(`${API_BASE}/api/patients/${patientId}/demographics`);
  if (!res.ok) {
    throw new Error(`Failed to fetch demographics: ${res.status}`);
  }
  return res.json();
export type EmergencyContact = {
  name: string;
  relationship: string;
  phoneNumber: string;
};

export type PatientDemographics = {
  patientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "male" | "female" | "non_binary" | "other" | "prefer_not_to_say";
  bloodType?: string;
  emergencyContact: EmergencyContact;
};

type Envelope<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  const body = (await res.json()) as Envelope<T>;
  if (!body.success || !body.data) {
    throw new Error(body.error ?? "Request failed");
  }
  return body.data;
}

export async function fetchDemographics(patientId: string): Promise<PatientDemographics> {
  return apiFetch<PatientDemographics>(`/api/v1/patients/${patientId}/demographics`);
}

export async function updateDemographics(
  patientId: string,
  data: Omit<PatientDemographicRecord, 'patientId'>,
): Promise<PatientDemographicRecord> {
  const res = await fetch(`${API_BASE}/api/patients/${patientId}/demographics`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`Failed to update demographics: ${res.status}`);
  }
  return res.json();
  data: Partial<Omit<PatientDemographics, "patientId">>,
): Promise<PatientDemographics> {
  return apiFetch<PatientDemographics>(`/api/v1/patients/${patientId}/demographics`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
