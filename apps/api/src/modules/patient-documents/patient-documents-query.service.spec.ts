import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PatientDocumentsQueryService } from './patient-documents-v2.service';
import { PatientDocument, DocumentStatus } from './entities/patient-document.entity';

describe('PatientDocumentsQueryService', () => {
  let svc: PatientDocumentsQueryService;
  const mockRepo = {
    findAndCount: jest.fn().mockResolvedValue([[{ id: '1' }], 1]),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        { status: DocumentStatus.ACTIVE, count: '3' },
      ]),
    })),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientDocumentsQueryService,
        { provide: getRepositoryToken(PatientDocument), useValue: mockRepo },
      ],
    }).compile();
    svc = module.get(PatientDocumentsQueryService);
  });
  it('findWithFilters returns items and total', async () => {
    const r = await svc.findWithFilters('p1');
    expect(r.items).toHaveLength(1);
    expect(r.total).toBe(1);
  });
  it('countByStatus returns all statuses', async () => {
    const r = await svc.countByStatus('p1');
    expect(r[DocumentStatus.ACTIVE]).toBe(3);
    expect(r[DocumentStatus.REVOKED]).toBe(0);
  });
});
