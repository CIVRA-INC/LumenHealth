import { CreatePatientIdentityInput, PatientIdentityServiceResult } from '@qyou/shared';

export async function createPatientIdentityClient(input: CreatePatientIdentityInput): Promise<PatientIdentityServiceResult> {
  const res = await fetch('/api/patient-identity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Failed to create patient identity');
  return res.json();
}
