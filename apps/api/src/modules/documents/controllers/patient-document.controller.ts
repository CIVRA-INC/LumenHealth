import {
  documentPreviewRequestSchema,
  type DocumentPreviewRequestInput,
} from '@qyou/shared';

export class PatientDocumentController {
  public async getDocumentPreview(input: DocumentPreviewRequestInput) {
    const validated = documentPreviewRequestSchema.parse(input);
    return {
      documentId: validated.documentId,
      previewUrl: `/api/documents/${validated.documentId}/preview?format=${validated.requestedFormat}`,
      status: 'ready',
    };
  }
}
