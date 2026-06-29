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

export type ContractResponse<T> =
  | { status: "success"; data: T; code: number }
  | { status: "error"; message: string; code: number };

function buildListPath(patientId: string): string {
  return `/api/v1/patients/${encodeURIComponent(patientId)}/documents`;
}

function buildItemPath(patientId: string, documentId: string): string {
  return `/api/v1/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(documentId)}`;
}

function buildAttachmentPath(patientId: string, documentId: string): string {
  return `${buildItemPath(patientId, documentId)}/attachments`;
}

export async function listDocumentsContract(
  baseUrl: string,
  patientId: string,
  clinicId: string,
): Promise<ContractResponse<DocumentDTO[]>> {
  try {
    const res = await fetch(`${baseUrl}${buildListPath(patientId)}`, {
      headers: { "x-clinic-id": clinicId },
    });
    const data = await res.json();
    if (!res.ok) return { status: "error", message: data.error || "Unknown error", code: res.status };
    return { status: "success", data: data as DocumentDTO[], code: res.status };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Network error", code: 0 };
  }
}

export async function getDocumentContract(
  baseUrl: string,
  patientId: string,
  documentId: string,
  clinicId: string,
): Promise<ContractResponse<DocumentDTO>> {
  try {
    const res = await fetch(`${baseUrl}${buildItemPath(patientId, documentId)}`, {
      headers: { "x-clinic-id": clinicId },
    });
    const data = await res.json();
    if (!res.ok) return { status: "error", message: data.error || "Unknown error", code: res.status };
    return { status: "success", data: data as DocumentDTO, code: res.status };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Network error", code: 0 };
  }
}

export async function createDocumentContract(
  baseUrl: string,
  patientId: string,
  clinicId: string,
  body: Omit<DocumentDTO, "id" | "patientId" | "clinicId" | "status" | "createdAt" | "updatedAt">,
): Promise<ContractResponse<DocumentDTO>> {
  try {
    const res = await fetch(`${baseUrl}${buildListPath(patientId)}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-clinic-id": clinicId },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return { status: "error", message: data.error || "Validation failed", code: res.status };
    return { status: "success", data: data as DocumentDTO, code: res.status };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Network error", code: 0 };
  }
}

export async function updateDocumentContract(
  baseUrl: string,
  patientId: string,
  documentId: string,
  clinicId: string,
  body: Partial<Omit<DocumentDTO, "id" | "patientId" | "clinicId" | "createdAt" | "updatedAt">>,
): Promise<ContractResponse<DocumentDTO>> {
  try {
    const res = await fetch(`${baseUrl}${buildItemPath(patientId, documentId)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-clinic-id": clinicId },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return { status: "error", message: data.error || "Update failed", code: res.status };
    return { status: "success", data: data as DocumentDTO, code: res.status };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Network error", code: 0 };
  }
}

export async function deleteDocumentContract(
  baseUrl: string,
  patientId: string,
  documentId: string,
  clinicId: string,
): Promise<ContractResponse<{ ok: boolean }>> {
  try {
    const res = await fetch(`${baseUrl}${buildItemPath(patientId, documentId)}`, {
      method: "DELETE",
      headers: { "x-clinic-id": clinicId },
    });
    const data = await res.json();
    if (!res.ok) return { status: "error", message: data.error || "Delete failed", code: res.status };
    return { status: "success", data: data as { ok: boolean }, code: res.status };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Network error", code: 0 };
  }
}

export async function listAttachmentsContract(
  baseUrl: string,
  patientId: string,
  documentId: string,
  clinicId: string,
): Promise<ContractResponse<AttachmentDTO[]>> {
  try {
    const res = await fetch(`${baseUrl}${buildAttachmentPath(patientId, documentId)}`, {
      headers: { "x-clinic-id": clinicId },
    });
    const data = await res.json();
    if (!res.ok) return { status: "error", message: data.error || "Unknown error", code: res.status };
    return { status: "success", data: data as AttachmentDTO[], code: res.status };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Network error", code: 0 };
  }
}

export async function uploadAttachmentContract(
  baseUrl: string,
  patientId: string,
  documentId: string,
  clinicId: string,
  body: Omit<AttachmentDTO, "id" | "createdAt">,
): Promise<ContractResponse<AttachmentDTO>> {
  try {
    const res = await fetch(`${baseUrl}${buildAttachmentPath(patientId, documentId)}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-clinic-id": clinicId },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return { status: "error", message: data.error || "Upload failed", code: res.status };
    return { status: "success", data: data as AttachmentDTO, code: res.status };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Network error", code: 0 };
  }
}

export async function deleteAttachmentContract(
  baseUrl: string,
  patientId: string,
  documentId: string,
  attachmentId: string,
  clinicId: string,
): Promise<ContractResponse<{ ok: boolean }>> {
  try {
    const res = await fetch(`${baseUrl}${buildAttachmentPath(patientId, documentId)}/${encodeURIComponent(attachmentId)}`, {
      method: "DELETE",
      headers: { "x-clinic-id": clinicId },
    });
    const data = await res.json();
    if (!res.ok) return { status: "error", message: data.error || "Delete failed", code: res.status };
    return { status: "success", data: data as { ok: boolean }, code: res.status };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Network error", code: 0 };
  }
}
