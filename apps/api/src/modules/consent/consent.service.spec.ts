import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConsentService } from './consent.service';
import { Consent, ConsentType, ConsentStatus } from './entities/consent.entity';

const FIXTURE: Consent = {
  id: 'consent-uuid-1',
  patientId: 'patient-uuid-1',
  consentType: ConsentType.TREATMENT,
  status: ConsentStatus.GRANTED,
  grantedAt: new Date('2026-06-01'),
  createdAt: new Date('2026-06-01'),
  updatedAt: new Date('2026-06-01'),
};

describe('ConsentService', () => {
  let service: ConsentService;
  const mockRepo = {
    create:   jest.fn().mockImplementation(dto => ({ ...FIXTURE, ...dto })),
    save:     jest.fn().mockImplementation(c => Promise.resolve(c)),
    find:     jest.fn().mockResolvedValue([FIXTURE]),
    findOne:  jest.fn().mockImplementation(({ where }) =>
      where.id === FIXTURE.id || (!where.id && where.status === ConsentStatus.GRANTED)
        ? Promise.resolve({ ...FIXTURE })
        : Promise.resolve(null)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsentService,
        { provide: getRepositoryToken(Consent), useValue: mockRepo },
      ],
    }).compile();
    service = module.get<ConsentService>(ConsentService);
  });

  it('grants consent', async () => {
    mockRepo.findOne.mockResolvedValueOnce(null);
    const result = await service.grant('p1', ConsentType.DATA_SHARING);
    expect(result.status).toBe(ConsentStatus.GRANTED);
  });

  it('throws ConflictException on duplicate active consent', async () => {
    await expect(service.grant('p1', ConsentType.TREATMENT)).rejects.toThrow(ConflictException);
  });

  it('revokes a granted consent', async () => {
    const result = await service.revoke(FIXTURE.id, FIXTURE.patientId);
    expect(result.status).toBe(ConsentStatus.REVOKED);
    expect(result.revokedAt).toBeDefined();
  });

  it('throws NotFoundException when revoking missing consent', async () => {
    mockRepo.findOne.mockResolvedValueOnce(null);
    await expect(service.revoke('bad-id', 'p1')).rejects.toThrow(NotFoundException);
  });

  it('finds all consents for patient', async () => {
    const result = await service.findByPatient(FIXTURE.patientId);
    expect(result).toHaveLength(1);
  });

  it('returns true for active consent check', async () => {
    const result = await service.hasActiveConsent(FIXTURE.patientId, ConsentType.TREATMENT);
    expect(result).toBe(true);
  });
});
