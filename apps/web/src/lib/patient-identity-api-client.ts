import { PatientIdentityContractResponse } from '@qyou/shared';

export async function fetchPatientIdentityApi(id: string): Promise<PatientIdentityContractResponse> {
  const res = await fetch(`/api/patient-identity/${id}`);
  if (!res.ok) throw new Error('API contract error');
  return res.json();
}
