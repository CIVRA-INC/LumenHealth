import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { PatientDocumentsService } from './patient-documents.service';
import { PatientDocument, DocumentType, DocumentStatus } from './entities/patient-document.entity';

const FIXTURE: PatientDocument = {
  id: 'doc-uuid-1',
  patientId: 'patient-uuid-1',
  uploadedBy: 'staff-uuid-1',
  fileName: 'lab_result.pdf',
  fileUrl: 'https://storage.example.com/lab_result.pdf',
  mimeType: 'application/pdf',
  fileSizeBytes: 204800,
  documentType: DocumentType.LAB_RESULT,
  status: DocumentStatus.ACTIVE,
  description: 'Blood work panel Q2 2026',
  metadata: { labId: 'LAB-001' },
  createdAt: new Date('2026-06-01'),
  updatedAt: new Date('2026-06-01'),
};

describe('PatientDocumentsService', () => {
  let service: PatientDocumentsService;
  const mockRepo = {
    create: jest.fn().mockImplementation(dto => ({ ...FIXTURE, ...dto })),
    save:   jest.fn().mockImplementation(doc => Promise.resolve(doc)),
    find:   jest.fn().mockResolvedValue([FIXTURE]),
    findOne: jest.fn().mockImplementation(({ where: { id } }) =>
      id === FIXTURE.id ? Promise.resolve(FIXTURE) : Promise.resolve(null)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientDocumentsService,
        { provide: getRepositoryToken(PatientDocument), useValue: mockRepo },
      ],
    }).compile();
    service = module.get<PatientDocumentsService>(PatientDocumentsService);
  });

  it('creates a document', async () => {
    const dto = { patientId: 'p1', fileName: 'f.pdf', fileUrl: 'url', mimeType: 'application/pdf', fileSizeBytes: 100 };
    const result = await service.create(dto as any, 'staff-1');
    expect(result.patientId).toBe('p1');
    expect(mockRepo.save).toHaveBeenCalled();
  });

  it('finds all documents for a patient', async () => {
    const docs = await service.findAllByPatient('patient-uuid-1');
    expect(docs).toHaveLength(1);
    expect(docs[0].status).toBe(DocumentStatus.ACTIVE);
  });

  it('throws NotFoundException for missing document', async () => {
    await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
  });

  it('revokes a document', async () => {
    const result = await service.revoke(FIXTURE.id);
    expect(result.status).toBe(DocumentStatus.REVOKED);
  });

  it('archives a document', async () => {
    const result = await service.archive(FIXTURE.id);
    expect(result.status).toBe(DocumentStatus.ARCHIVED);
  });
});
