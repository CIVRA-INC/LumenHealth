// Document and attachment types — Sprint 2 / Stellar Wave: patient records.
// API contract: documents and attachments.

export type DocumentStatus = "active" | "archived";

export type DocumentErrorCode =
  | "DOCUMENT_NOT_FOUND"
  | "DOCUMENT_INVALID_INPUT";

export type DocumentRecord = {
  documentId: string;
  patientId: string;
  clinicId: string;
  fileName: string;
  /** MIME type (e.g. "application/pdf", "image/png"). */
  fileType: string;
  /** File size in bytes. */
  fileSize: number;
  status: DocumentStatus;
  uploadedAt: string;
  updatedAt: string;
  archivedAt?: string;
};
