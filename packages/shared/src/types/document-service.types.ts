export type ProcessingStatus = 'pending' | 'scanning' | 'stored' | 'rejected';

export interface DocumentUploadResult {
  documentId: string;
  patientId: string;
  status: ProcessingStatus;
  storageUrl: string;
  uploadedAt: string;
}

export interface DocumentServiceConfig {
  maxAttachmentSizeBytes: number;
  enableVirusScanning: boolean;
  allowedMimeTypes: string[];
}
