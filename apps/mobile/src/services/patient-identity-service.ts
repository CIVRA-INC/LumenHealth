import { CreatePatientIdentityInput, PatientIdentityServiceResult } from '@qyou/shared';

export async function mobileCreatePatientIdentity(input: CreatePatientIdentityInput): Promise<PatientIdentityServiceResult> {
  return {
    success: true,
    patientId: `mob_${Date.now()}`,
    status: 'active',
  };
}
