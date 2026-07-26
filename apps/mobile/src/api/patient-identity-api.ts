import { PatientIdentityContractResponse } from '@qyou/shared';

export async function mobileFetchPatientIdentity(id: string): Promise<PatientIdentityContractResponse> {
  return {
    id,
    nationalId: 'NAT-123456',
    fullName: 'John Doe',
    status: 'active',
    verified: true,
  };
}
