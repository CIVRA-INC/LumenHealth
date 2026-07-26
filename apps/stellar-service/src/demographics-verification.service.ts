import { sha256Hash, canonicalize } from '@lumen/types';
import type { PatientDemographicRecord } from '@qyou/shared';

export type DemographicsVerificationStatus = 'verified' | 'mismatch' | 'not_anchored';

export interface DemographicsVerificationResult {
  patientId: string;
  status: DemographicsVerificationStatus;
  storedHash: string;
  onChainHash: string | null;
  verifiedAt: string;
}

export type FetchStoredDemographics = (patientId: string) => Promise<PatientDemographicRecord | null>;
export type FetchOnChainHash = (patientId: string) => Promise<string | null>;

export class DemographicsVerificationService {
  constructor(
    private readonly fetchStoredDemographics: FetchStoredDemographics,
    private readonly fetchOnChainHash: FetchOnChainHash,
  ) {}

  private hashDemographics(record: PatientDemographicRecord): string {
    const { patientId, ...rest } = record;
    return sha256Hash(canonicalize({ patientId, ...rest }));
  }

  async verifyDemographics(patientId: string): Promise<DemographicsVerificationResult> {
    const record = await this.fetchStoredDemographics(patientId);
    if (!record) {
      return {
        patientId,
        status: 'not_anchored',
        storedHash: '',
        onChainHash: null,
        verifiedAt: new Date().toISOString(),
      };
    }

    const storedHash = this.hashDemographics(record);
    const onChainHash = await this.fetchOnChainHash(patientId);

    if (!onChainHash) {
      return {
        patientId,
        status: 'not_anchored',
        storedHash,
        onChainHash: null,
        verifiedAt: new Date().toISOString(),
      };
    }

    const status: DemographicsVerificationStatus = storedHash === onChainHash ? 'verified' : 'mismatch';

    return {
      patientId,
      status,
      storedHash,
      onChainHash,
      verifiedAt: new Date().toISOString(),
    };
  }

  async getVerificationStatus(patientId: string): Promise<DemographicsVerificationStatus> {
    const result = await this.verifyDemographics(patientId);
    return result.status;
  }
}
