export type DocumentCategory = "clinical" | "administrative" | "lab-report" | "imaging" | "consent-form" | "other";

export type DocumentStatus = "pending" | "uploaded" | "verified" | "archived";

export type DocumentRecord = {
  id: string;
  patientId: string;
  clinicId: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  category: DocumentCategory;
  status: DocumentStatus;
  uploadedBy: string;
  description: string;
  tags: string[];
  storageUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type AttachmentRecord = {
  id: string;
  documentId: string;
  patientId: string;
  clinicId: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  storageKey: string;
  uploadedBy: string;
  createdAt: string;
};

export type CreateDocumentPayload = Omit<DocumentRecord, "id" | "clinicId" | "status" | "createdAt" | "updatedAt">;

export type UpdateDocumentPayload = Partial<Omit<DocumentRecord, "id" | "patientId" | "clinicId" | "createdAt" | "updatedAt">>;

export type UploadAttachmentPayload = Omit<AttachmentRecord, "id" | "createdAt">;

export function sanitizeDocumentPayload(payload: CreateDocumentPayload): CreateDocumentPayload {
  return {
    ...payload,
    tags: payload.tags || [],
    description: payload.description || "",
  };
}

export function validateDocumentPayload(payload: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (!payload.patientId || typeof payload.patientId !== "string") errors.push("patientId is required");
  if (!payload.fileName || typeof payload.fileName !== "string") errors.push("fileName is required");
  if (!payload.fileType || typeof payload.fileType !== "string") errors.push("fileType is required");
  if (!payload.category || !["clinical", "administrative", "lab-report", "imaging", "consent-form", "other"].includes(payload.category as string))
    errors.push("category must be one of: clinical, administrative, lab-report, imaging, consent-form, other");
  if (payload.fileSizeBytes && typeof payload.fileSizeBytes !== "number") errors.push("fileSizeBytes must be a number");
  return errors;
}

export function createDocumentRecord(payload: CreateDocumentPayload, clinicId: string): DocumentRecord {
  const sanitized = sanitizeDocumentPayload(payload);
  const now = new Date().toISOString();
  return {
    id: `doc_${Date.now()}`,
    clinicId,
    status: "pending",
    ...sanitized,
    createdAt: now,
    updatedAt: now,
  };
}

export function createAttachmentRecord(payload: UploadAttachmentPayload): AttachmentRecord {
  const now = new Date().toISOString();
  return {
    id: `att_${Date.now()}`,
    ...payload,
    createdAt: now,
  };
}

export const fixtures = {
  validClinical: {
    patientId: "pat_demo_01",
    fileName: "lab-result.pdf",
    fileType: "application/pdf",
    fileSizeBytes: 245760,
    category: "lab-report" as DocumentCategory,
    uploadedBy: "staff_demo_01",
    description: "Complete blood count results",
    tags: ["lab", "blood", "routine"],
    storageUrl: "https://storage.example.com/lab-result.pdf",
  } satisfies CreateDocumentPayload,
  validAttachment: {
    documentId: "doc_demo_01",
    patientId: "pat_demo_01",
    clinicId: "clinic_demo_01",
    fileName: "scan001.dcm",
    mimeType: "application/dicom",
    fileSizeBytes: 5242880,
    storageKey: "uploads/scan001.dcm",
    uploadedBy: "staff_demo_01",
  } satisfies UploadAttachmentPayload,
  invalidPayload: {} as Record<string, unknown>,
};
