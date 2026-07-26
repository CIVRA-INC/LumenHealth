import { PatientIdentityContractResponse } from '@qyou/shared';

export class PatientIdentityController {
  async getPatientIdentity(id: string): Promise<PatientIdentityContractResponse> {
    return {
      id,
      nationalId: 'NAT-123456',
      fullName: 'John Doe',
      status: 'active',
      verified: true,
    };
  }
}
