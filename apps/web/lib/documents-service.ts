export type DocumentData = {
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

export type AttachmentData = {
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

export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string };

const BASE = "/api/v1";

export function createDocumentsApi(baseUrl: string = "") {
  const apiUrl = baseUrl || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  async function listDocuments(patientId: string, clinicId: string): Promise<ApiResponse<DocumentData[]>> {
    try {
      const res = await fetch(`${apiUrl}${BASE}/patients/${patientId}/documents`, {
        headers: { "x-clinic-id": clinicId },
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      return { ok: true, data: await res.json() };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
    }
  }

  async function getDocument(patientId: string, documentId: string, clinicId: string): Promise<ApiResponse<DocumentData>> {
    try {
      const res = await fetch(`${apiUrl}${BASE}/patients/${patientId}/documents/${documentId}`, {
        headers: { "x-clinic-id": clinicId },
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      return { ok: true, data: await res.json() };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
    }
  }

  async function createDocument(
    patientId: string,
    clinicId: string,
    data: Omit<DocumentData, "id" | "patientId" | "clinicId" | "status" | "createdAt" | "updatedAt">,
  ): Promise<ApiResponse<DocumentData>> {
    try {
      const res = await fetch(`${apiUrl}${BASE}/patients/${patientId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-clinic-id": clinicId },
        body: JSON.stringify(data),
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      return { ok: true, data: await res.json() };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
    }
  }

  async function updateDocument(
    patientId: string,
    documentId: string,
    clinicId: string,
    data: Partial<Omit<DocumentData, "id" | "patientId" | "clinicId" | "createdAt" | "updatedAt">>,
  ): Promise<ApiResponse<DocumentData>> {
    try {
      const res = await fetch(`${apiUrl}${BASE}/patients/${patientId}/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-clinic-id": clinicId },
        body: JSON.stringify(data),
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      return { ok: true, data: await res.json() };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
    }
  }

  async function deleteDocument(patientId: string, documentId: string, clinicId: string): Promise<ApiResponse<boolean>> {
    try {
      const res = await fetch(`${apiUrl}${BASE}/patients/${patientId}/documents/${documentId}`, {
        method: "DELETE",
        headers: { "x-clinic-id": clinicId },
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      return { ok: true, data: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
    }
  }

  async function listAttachments(patientId: string, documentId: string, clinicId: string): Promise<ApiResponse<AttachmentData[]>> {
    try {
      const res = await fetch(`${apiUrl}${BASE}/patients/${patientId}/documents/${documentId}/attachments`, {
        headers: { "x-clinic-id": clinicId },
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      return { ok: true, data: await res.json() };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
    }
  }

  async function uploadAttachment(
    patientId: string,
    documentId: string,
    clinicId: string,
    data: Omit<AttachmentData, "id" | "createdAt">,
  ): Promise<ApiResponse<AttachmentData>> {
    try {
      const res = await fetch(`${apiUrl}${BASE}/patients/${patientId}/documents/${documentId}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-clinic-id": clinicId },
        body: JSON.stringify(data),
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      return { ok: true, data: await res.json() };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
    }
  }

  return { listDocuments, getDocument, createDocument, updateDocument, deleteDocument, listAttachments, uploadAttachment };
}
