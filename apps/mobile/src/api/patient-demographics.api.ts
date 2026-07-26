import type { PatientDemographicRecord } from '@qyou/shared';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function fetchDemographics(patientId: string): Promise<PatientDemographicRecord> {
  const res = await fetch(`${API_BASE}/api/patients/${patientId}/demographics`);
  if (!res.ok) {
    throw new Error(`Failed to fetch demographics: ${res.status}`);
  }
  return res.json();
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
}
