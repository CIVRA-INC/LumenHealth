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

export type CreateDocumentBody = Omit<DocumentDTO, "id" | "patientId" | "clinicId" | "status" | "createdAt" | "updatedAt">;

export type UpdateDocumentBody = Partial<Omit<DocumentDTO, "id" | "patientId" | "clinicId" | "createdAt" | "updatedAt">>;

export type UploadAttachmentBody = Omit<AttachmentDTO, "id" | "createdAt">;

export type ContractResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: string; status: number };

const BASE_PATH = "/api/v1";

export function documentsContract(baseUrl: string) {
  const api = baseUrl.replace(/\/+$/, "");

  async function request<T>(
    method: string,
    path: string,
    clinicId: string,
    body?: unknown,
  ): Promise<ContractResult<T>> {
    try {
      const res = await fetch(`${api}${path}`, {
        method,
        headers: {
          "content-type": "application/json",
          "x-clinic-id": clinicId,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || `HTTP ${res.status}`, status: res.status };
      return { ok: true, data: data as T, status: res.status };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Network error", status: 0 };
    }
  }

  function list(patientId: string, clinicId: string) {
    return request<DocumentDTO[]>("GET", `${BASE_PATH}/patients/${encodeURIComponent(patientId)}/documents`, clinicId);
  }

  function get(patientId: string, documentId: string, clinicId: string) {
    return request<DocumentDTO>("GET", `${BASE_PATH}/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(documentId)}`, clinicId);
  }

  function create(patientId: string, clinicId: string, body: CreateDocumentBody) {
    return request<DocumentDTO>("POST", `${BASE_PATH}/patients/${encodeURIComponent(patientId)}/documents`, clinicId, body);
  }

  function update(patientId: string, documentId: string, clinicId: string, body: UpdateDocumentBody) {
    return request<DocumentDTO>("PATCH", `${BASE_PATH}/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(documentId)}`, clinicId, body);
  }

  function remove(patientId: string, documentId: string, clinicId: string) {
    return request<{ ok: boolean }>("DELETE", `${BASE_PATH}/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(documentId)}`, clinicId);
  }

  function listAttachments(patientId: string, documentId: string, clinicId: string) {
    return request<AttachmentDTO[]>("GET", `${BASE_PATH}/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(documentId)}/attachments`, clinicId);
  }

  function uploadAttachment(patientId: string, documentId: string, clinicId: string, body: UploadAttachmentBody) {
    return request<AttachmentDTO>("POST", `${BASE_PATH}/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(documentId)}/attachments`, clinicId, body);
  }

  function removeAttachment(patientId: string, documentId: string, attachmentId: string, clinicId: string) {
    return request<{ ok: boolean }>("DELETE", `${BASE_PATH}/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(documentId)}/attachments/${encodeURIComponent(attachmentId)}`, clinicId);
  }

  return { list, get, create, update, remove, listAttachments, uploadAttachment, removeAttachment };
}
