import { CreatePatientIdentityInput, PatientIdentityServiceResult } from '@qyou/shared';

export class PatientIdentityService {
  async registerPatient(input: CreatePatientIdentityInput): Promise<PatientIdentityServiceResult> {
    const patientId = `pat_${Date.now()}`;
    return {
      success: true,
      patientId,
      status: 'active',
    };
  }

  async getPatientById(patientId: string) {
    return {
      id: patientId,
      status: 'active',
    };
  }
}
