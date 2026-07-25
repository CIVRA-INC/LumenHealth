export interface MockAttachmentResponse {
  attachmentId: string;
  originalFileName: string;
  storagePath: string;
  status: 'valid' | 'corrupted' | 'quarantined';
}

export interface ApiDocumentFixture {
  fixtureId: string;
  description: string;
  mockAttachment: MockAttachmentResponse;
}

export interface DocumentTestEnvironmentConfig {
  useMockStorage: boolean;
  bypassVirusScanInTests: boolean;
}
