import {
  documentProcessingRequestSchema,
  type DocumentProcessingRequestInput,
  type DocumentUploadResult,
} from '@qyou/shared';

export class PatientDocumentService {
  public async processUpload(patientId: string, input: DocumentProcessingRequestInput): Promise<DocumentUploadResult> {
    const validated = documentProcessingRequestSchema.parse(input);
    return {
      documentId: validated.documentId,
      patientId,
      status: 'stored',
      storageUrl: `/storage/documents/${patientId}/${validated.documentId}.pdf`,
      uploadedAt: new Date().toISOString(),
    };
  }
}
