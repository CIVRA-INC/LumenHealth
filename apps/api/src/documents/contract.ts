export type DocumentDTO = {
  id: string;
  patientId: string;
  clinicId: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  category: string;
  status: string;
  uploadedBy: string;
  description: string;
  tags: string[];
  storageUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type AttachmentDTO = {
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

export type CreateDocumentRequest = Omit<DocumentDTO, "id" | "clinicId" | "status" | "createdAt" | "updatedAt">;

export type UpdateDocumentRequest = Partial<Omit<DocumentDTO, "id" | "patientId" | "clinicId" | "createdAt" | "updatedAt">>;

export type UploadAttachmentRequest = Omit<AttachmentDTO, "id" | "createdAt">;

export type ContractEndpoint = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
  response: unknown;
};

export const DOCUMENTS_CONTRACT = {
  list: {
    method: "GET" as const,
    path: "/api/v1/patients/:patientId/documents",
    headers: { "x-clinic-id": "string" },
    response: [] as DocumentDTO[],
  },
  get: {
    method: "GET" as const,
    path: "/api/v1/patients/:patientId/documents/:documentId",
    headers: { "x-clinic-id": "string" },
    response: {} as DocumentDTO,
  },
  create: {
    method: "POST" as const,
    path: "/api/v1/patients/:patientId/documents",
    headers: { "x-clinic-id": "string", "content-type": "application/json" },
    body: {} as CreateDocumentRequest,
    response: {} as DocumentDTO,
  },
  update: {
    method: "PATCH" as const,
    path: "/api/v1/patients/:patientId/documents/:documentId",
    headers: { "x-clinic-id": "string", "content-type": "application/json" },
    body: {} as UpdateDocumentRequest,
    response: {} as DocumentDTO,
  },
  delete: {
    method: "DELETE" as const,
    path: "/api/v1/patients/:patientId/documents/:documentId",
    headers: { "x-clinic-id": "string" },
    response: { ok: true },
  },
  listAttachments: {
    method: "GET" as const,
    path: "/api/v1/patients/:patientId/documents/:documentId/attachments",
    headers: { "x-clinic-id": "string" },
    response: [] as AttachmentDTO[],
  },
  uploadAttachment: {
    method: "POST" as const,
    path: "/api/v1/patients/:patientId/documents/:documentId/attachments",
    headers: { "x-clinic-id": "string", "content-type": "application/json" },
    body: {} as UploadAttachmentRequest,
    response: {} as AttachmentDTO,
  },
  deleteAttachment: {
    method: "DELETE" as const,
    path: "/api/v1/patients/:patientId/documents/:documentId/attachments/:attachmentId",
    headers: { "x-clinic-id": "string" },
    response: { ok: true },
  },
} as const;

export type DocumentsEndpoints = typeof DOCUMENTS_CONTRACT;

export function buildListUrl(baseUrl: string, patientId: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/api/v1/patients/${encodeURIComponent(patientId)}/documents`;
}

export function buildItemUrl(baseUrl: string, patientId: string, documentId: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/api/v1/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(documentId)}`;
}

export function buildAttachmentsUrl(baseUrl: string, patientId: string, documentId: string): string {
  return `${buildItemUrl(baseUrl, patientId, documentId)}/attachments`;
}

export function validateContractResponse(status: number, body: unknown): string | null {
  if (status === 200 || status === 201) return null;
  if (status === 400) return "VALIDATION_ERROR";
  if (status === 404) return "NOT_FOUND";
  if (status === 500) return "SERVER_ERROR";
  return `UNEXPECTED_STATUS_${status}`;
}
