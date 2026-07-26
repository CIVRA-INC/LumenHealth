import type { PatientDocument, DocumentCategory } from "@qyou/shared";

const API_BASE_URL = "http://localhost:4000";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string }).message ??
        `API request failed (${res.status})`,
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function listPatientDocuments(patientId: string): Promise<PatientDocument[]> {
  const body = await apiFetch<{ documents: PatientDocument[] }>(
    `/api/v1/patients/${patientId}/documents`,
  );
  return body.documents;
}

export async function uploadPatientDocument(
  patientId: string,
  payload: {
    title: string;
    category: DocumentCategory;
    attachment: { fileName: string; fileSizeBytes: number; mimeType: string; checksum: string };
    notes?: string;
  },
): Promise<PatientDocument> {
  const body = await apiFetch<{ document: PatientDocument }>(
    `/api/v1/patients/${patientId}/documents`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return body.document;
}

export async function getPatientDocument(
  patientId: string,
  documentId: string,
): Promise<PatientDocument> {
  const body = await apiFetch<{ document: PatientDocument }>(
    `/api/v1/patients/${patientId}/documents/${documentId}`,
  );
  return body.document;
}

export async function deletePatientDocument(
  patientId: string,
  documentId: string,
): Promise<void> {
  await apiFetch<void>(
    `/api/v1/patients/${patientId}/documents/${documentId}`,
    { method: "DELETE" },
  );
}
