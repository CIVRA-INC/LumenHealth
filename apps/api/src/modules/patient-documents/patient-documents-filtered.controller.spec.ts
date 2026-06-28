import { Test } from '@nestjs/testing';
import { PatientDocumentsFilteredController } from './patient-documents-filtered.controller';
import { PatientDocumentsQueryService } from './patient-documents-v2.service';
import { DocumentStatus } from './entities/patient-document.entity';

describe('PatientDocumentsFilteredController', () => {
  let ctrl: PatientDocumentsFilteredController;
  const mockSvc = {
    findWithFilters: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    countByStatus:   jest.fn().mockResolvedValue({ active: 2, revoked: 0, archived: 0, pending: 0 }),
  };
  beforeEach(async () => {
    const m = await Test.createTestingModule({
      controllers: [PatientDocumentsFilteredController],
      providers:   [{ provide: PatientDocumentsQueryService, useValue: mockSvc }],
    }).compile();
    ctrl = m.get(PatientDocumentsFilteredController);
  });
  it('search calls findWithFilters', async () => {
    await ctrl.search('p1', {});
    expect(mockSvc.findWithFilters).toHaveBeenCalledWith('p1', expect.any(Object));
  });
  it('stats calls countByStatus', async () => {
    const r = await ctrl.stats('p1');
    expect(r[DocumentStatus.ACTIVE]).toBe(2);
  });
});
