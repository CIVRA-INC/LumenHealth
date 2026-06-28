import { Test, TestingModule } from '@nestjs/testing';
import { PatientDocumentsController } from './patient-documents.controller';
import { PatientDocumentsService } from './patient-documents.service';
import { DocumentType, DocumentStatus } from './entities/patient-document.entity';

const MOCK_DOC = {
  id: 'doc-1', patientId: 'patient-1',
  fileName: 'test.pdf', fileUrl: 'http://test',
  mimeType: 'application/pdf', fileSizeBytes: 1024,
  documentType: DocumentType.LAB_RESULT,
  status: DocumentStatus.ACTIVE,
  createdAt: new Date(), updatedAt: new Date(),
};

describe('PatientDocumentsController', () => {
  let controller: PatientDocumentsController;
  const mockSvc = {
    create:          jest.fn().mockResolvedValue(MOCK_DOC),
    findAllByPatient: jest.fn().mockResolvedValue([MOCK_DOC]),
    findOne:         jest.fn().mockResolvedValue(MOCK_DOC),
    revoke:          jest.fn().mockResolvedValue({ ...MOCK_DOC, status: DocumentStatus.REVOKED }),
    archive:         jest.fn().mockResolvedValue({ ...MOCK_DOC, status: DocumentStatus.ARCHIVED }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PatientDocumentsController],
      providers:   [{ provide: PatientDocumentsService, useValue: mockSvc }],
    }).compile();
    controller = module.get<PatientDocumentsController>(PatientDocumentsController);
  });

  it('creates a document', async () => {
    const result = await controller.create('patient-1', { patientId: 'patient-1', fileName: 'f.pdf', fileUrl: 'u', mimeType: 'application/pdf', fileSizeBytes: 100 } as any);
    expect(result.id).toBe('doc-1');
  });
  it('lists all documents for patient', async () => {
    const result = await controller.findAll('patient-1');
    expect(result).toHaveLength(1);
  });
  it('finds one document', async () => {
    const result = await controller.findOne('doc-1');
    expect(result.id).toBe('doc-1');
  });
  it('revokes a document', async () => {
    const result = await controller.revoke('doc-1');
    expect(result.status).toBe(DocumentStatus.REVOKED);
  });
  it('archives a document', async () => {
    const result = await controller.archive('doc-1');
    expect(result.status).toBe(DocumentStatus.ARCHIVED);
  });
});
