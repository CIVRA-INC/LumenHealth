import type { PatientDocument, DocumentCategory } from "@qyou/shared";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function authHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function listPatientDocuments(
  patientId: string,
  token: string,
): Promise<PatientDocument[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/patients/${patientId}/documents`, {
    headers: authHeaders(token),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string }).message ??
        `Failed to fetch documents (${res.status})`,
    );
  }

  const body = (await res.json()) as { documents: PatientDocument[] };
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
  token: string,
): Promise<PatientDocument> {
  const res = await fetch(`${API_BASE_URL}/api/v1/patients/${patientId}/documents`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string }).message ??
        `Failed to upload document (${res.status})`,
    );
  }

  const body = (await res.json()) as { document: PatientDocument };
  return body.document;
}

export async function getPatientDocument(
  patientId: string,
  documentId: string,
  token: string,
): Promise<PatientDocument> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/patients/${patientId}/documents/${documentId}`,
    { headers: authHeaders(token) },
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string }).message ??
        `Failed to fetch document (${res.status})`,
    );
  }

  const body = (await res.json()) as { document: PatientDocument };
  return body.document;
}

export async function deletePatientDocument(
  patientId: string,
  documentId: string,
  token: string,
): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/patients/${patientId}/documents/${documentId}`,
    { method: "DELETE", headers: authHeaders(token) },
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string }).message ??
        `Failed to delete document (${res.status})`,
    );
  }
}
