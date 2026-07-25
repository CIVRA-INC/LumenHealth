export type DocumentCategory = 'lab_report' | 'prescription' | 'imaging' | 'discharge_summary' | 'other';

export interface AttachmentMetadata {
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  checksum: string;
}

export interface PatientDocument {
  id: string;
  patientId: string;
  title: string;
  category: DocumentCategory;
  attachment: AttachmentMetadata;
  uploadedAt: string;
  notes?: string;
}

export interface PatientDocumentFixture {
  sampleDocuments: PatientDocument[];
}
