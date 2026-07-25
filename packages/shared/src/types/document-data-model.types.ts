export type AccessLevel = 'public_read' | 'restricted_practitioner' | 'confidential_patient';

export interface DocumentStoragePolicy {
  retentionDays: number;
  encryptedAtRest: boolean;
  backupRegion: string;
}

export interface DocumentAccessControl {
  documentId: string;
  accessLevel: AccessLevel;
  authorizedRoles: string[];
}

export interface PatientRecordHeader {
  patientId: string;
  totalDocumentsCount: number;
  lastUpdatedTimestamp: string;
}
