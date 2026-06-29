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

export type ServiceResult<T> = { type: "success"; data: T } | { type: "error"; message: string };

const API_BASE = "/api/v1";

export function createMobileDocumentsService(baseUrl: string) {
  async function request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<ServiceResult<T>> {
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers as Record<string, string>),
        },
      });
      if (!res.ok) return { type: "error", message: `HTTP ${res.status}: ${res.statusText}` };
      return { type: "success", data: await res.json() };
    } catch (e) {
      return { type: "error", message: e instanceof Error ? e.message : "Network error" };
    }
  }

  function listDocuments(patientId: string, clinicId: string) {
    return request<DocumentDTO[]>(
      `${API_BASE}/patients/${patientId}/documents`,
      { headers: { "x-clinic-id": clinicId } },
    );
  }

  function getDocument(patientId: string, documentId: string, clinicId: string) {
    return request<DocumentDTO>(
      `${API_BASE}/patients/${patientId}/documents/${documentId}`,
      { headers: { "x-clinic-id": clinicId } },
    );
  }

  function createDocument(patientId: string, clinicId: string, data: Omit<DocumentDTO, "id" | "patientId" | "clinicId" | "status" | "createdAt" | "updatedAt">) {
    return request<DocumentDTO>(
      `${API_BASE}/patients/${patientId}/documents`,
      {
        method: "POST",
        headers: { "x-clinic-id": clinicId },
        body: JSON.stringify(data),
      },
    );
  }

  function updateDocument(patientId: string, documentId: string, clinicId: string, data: Partial<Omit<DocumentDTO, "id" | "patientId" | "clinicId" | "createdAt" | "updatedAt">>) {
    return request<DocumentDTO>(
      `${API_BASE}/patients/${patientId}/documents/${documentId}`,
      {
        method: "PATCH",
        headers: { "x-clinic-id": clinicId },
        body: JSON.stringify(data),
      },
    );
  }

  function deleteDocument(patientId: string, documentId: string, clinicId: string) {
    return request<{ ok: boolean }>(
      `${API_BASE}/patients/${patientId}/documents/${documentId}`,
      {
        method: "DELETE",
        headers: { "x-clinic-id": clinicId },
      },
    );
  }

  function listAttachments(patientId: string, documentId: string, clinicId: string) {
    return request<AttachmentDTO[]>(
      `${API_BASE}/patients/${patientId}/documents/${documentId}/attachments`,
      { headers: { "x-clinic-id": clinicId } },
    );
  }

  function uploadAttachment(patientId: string, documentId: string, clinicId: string, data: Omit<AttachmentDTO, "id" | "createdAt">) {
    return request<AttachmentDTO>(
      `${API_BASE}/patients/${patientId}/documents/${documentId}/attachments`,
      {
        method: "POST",
        headers: { "x-clinic-id": clinicId },
        body: JSON.stringify(data),
      },
    );
  }

  return { listDocuments, getDocument, createDocument, updateDocument, deleteDocument, listAttachments, uploadAttachment };
}
