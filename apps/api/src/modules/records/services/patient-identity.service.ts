import {
  patientIdentityInputSchema,
  type PatientIdentity,
  type PatientIdentityInput,
} from '@qyou/shared';
import { patientIdentityStore } from '../repositories/in-memory-patient-identity.repository.js';

export class PatientIdentityService {
  public async getIdentity(patientId: string): Promise<PatientIdentity | undefined> {
    return patientIdentityStore.findById(patientId);
  }

  public async updateIdentity(
    patientId: string,
    clinicId: string,
    input: PatientIdentityInput,
  ): Promise<PatientIdentity> {
    const validated = patientIdentityInputSchema.parse(input);
    return patientIdentityStore.upsert(patientId, clinicId, validated);
  }

  public async anchorIdentity(
    patientId: string,
    identityHash: string,
    stellarTxHash: string,
  ): Promise<void> {
    await patientIdentityStore.setAnchor(
      patientId,
      identityHash,
      stellarTxHash,
      new Date().toISOString(),
    );
  }
}

export const patientIdentityService = new PatientIdentityService();
