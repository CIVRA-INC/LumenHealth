export type DocumentUploadStep = 'select_file' | 'add_metadata' | 'verifying' | 'completed';

export interface DocumentViewerState {
  activeDocumentId?: string;
  isPreviewOpen: boolean;
  zoomLevel: number;
}

export interface DocumentUIConfig {
  maxUploadSizeBytes: number;
  allowedExtensions: string[];
  enableThumbnailPreview: boolean;
}
