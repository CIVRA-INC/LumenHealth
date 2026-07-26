import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  DemographicsVerificationService,
  type FetchStoredDemographics,
  type FetchOnChainHash,
} from '../demographics-verification.service.js';
import type { PatientDemographicRecord } from '@qyou/shared';

const sampleRecord: PatientDemographicRecord = {
  patientId: 'patient_401',
  firstName: 'Jane',
  lastName: 'Doe',
  dateOfBirth: '1992-05-14',
  gender: 'female',
  bloodType: 'O+',
  emergencyContact: {
    name: 'John Doe',
    relationship: 'Spouse',
    phoneNumber: '+1-555-0199',
  },
};

describe('DemographicsVerificationService', () => {
  let fetchStored: ReturnType<typeof vi.fn<FetchStoredDemographics>>;
  let fetchOnChain: ReturnType<typeof vi.fn<FetchOnChainHash>>;
  let service: DemographicsVerificationService;

  beforeEach(() => {
    fetchStored = vi.fn();
    fetchOnChain = vi.fn();
    service = new DemographicsVerificationService(fetchStored, fetchOnChain);
  });

  it('returns "verified" when stored hash matches on-chain hash', async () => {
    fetchStored.mockResolvedValue(sampleRecord);
    // The service hashes the record deterministically; provide the same hash
    // by letting the service compute it and then returning it from fetchOnChain.
    const result = await service.verifyDemographics('patient_401');
    fetchOnChain.mockResolvedValue(result.storedHash);

    const verification = await service.verifyDemographics('patient_401');
    expect(verification.status).toBe('verified');
    expect(verification.storedHash).toBe(verification.onChainHash);
  });

  it('returns "mismatch" when stored hash differs from on-chain hash', async () => {
    fetchStored.mockResolvedValue(sampleRecord);
    fetchOnChain.mockResolvedValue('a-completely-different-hash');

    const result = await service.verifyDemographics('patient_401');
    expect(result.status).toBe('mismatch');
    expect(result.storedHash).not.toBe(result.onChainHash);
  });

  it('returns "not_anchored" when no on-chain hash exists', async () => {
    fetchStored.mockResolvedValue(sampleRecord);
    fetchOnChain.mockResolvedValue(null);

    const result = await service.verifyDemographics('patient_401');
    expect(result.status).toBe('not_anchored');
    expect(result.onChainHash).toBeNull();
  });

  it('returns "not_anchored" when no stored record exists', async () => {
    fetchStored.mockResolvedValue(null);
    fetchOnChain.mockResolvedValue(null);

    const result = await service.verifyDemographics('patient_401');
    expect(result.status).toBe('not_anchored');
    expect(result.storedHash).toBe('');
  });

  it('getVerificationStatus returns only the status string', async () => {
    fetchStored.mockResolvedValue(sampleRecord);
    fetchOnChain.mockResolvedValue(null);

    const status = await service.getVerificationStatus('patient_401');
    expect(status).toBe('not_anchored');
  });

  it('produces a stable hash for the same demographics input', async () => {
    fetchStored.mockResolvedValue(sampleRecord);
    fetchOnChain.mockResolvedValue(null);

    const first = await service.verifyDemographics('patient_401');
    fetchStored.mockResolvedValue(sampleRecord);
    const second = await service.verifyDemographics('patient_401');
    expect(first.storedHash).toBe(second.storedHash);
  });

  it('produces different hashes when demographics differ', async () => {
    fetchStored.mockResolvedValue(sampleRecord);
    fetchOnChain.mockResolvedValue(null);
    const hashA = (await service.verifyDemographics('patient_401')).storedHash;

    const modified = { ...sampleRecord, firstName: 'John' };
    fetchStored.mockResolvedValue(modified);
    const hashB = (await service.verifyDemographics('patient_401')).storedHash;

    expect(hashA).not.toBe(hashB);
  });
});
