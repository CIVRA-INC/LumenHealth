import type { PatientIdentity, PatientIdentityInput } from '@qyou/shared';
import { patientIdentitySchema, patientIdentityInputSchema } from '@qyou/shared';

export class InMemoryPatientIdentityRepository {
  private readonly identities: Map<string, PatientIdentity> = new Map();

  public async findById(patientId: string): Promise<PatientIdentity | undefined> {
    return this.identities.get(patientId);
  }

  public async upsert(patientId: string, clinicId: string, input: PatientIdentityInput): Promise<PatientIdentity> {
    const existing = this.identities.get(patientId);
    const now = new Date().toISOString();

    const record: PatientIdentity = {
      patientId,
      clinicId,
      ...input,
      identityHash: existing?.identityHash,
      anchoredAt: existing?.anchoredAt,
      stellarTxHash: existing?.stellarTxHash,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    const validated = patientIdentitySchema.parse(record);
    this.identities.set(patientId, validated);
    return validated;
  }

  public async setAnchor(
    patientId: string,
    identityHash: string,
    stellarTxHash: string,
    anchoredAt: string,
  ): Promise<void> {
    const existing = this.identities.get(patientId);
    if (existing) {
      this.identities.set(patientId, {
        ...existing,
        identityHash,
        stellarTxHash,
        anchoredAt,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  public async findAllByClinic(clinicId: string): Promise<PatientIdentity[]> {
    return Array.from(this.identities.values()).filter((i) => i.clinicId === clinicId);
  }

  public _reset(): void {
    this.identities.clear();
  }
}

export const patientIdentityStore = new InMemoryPatientIdentityRepository();
