import type { DocumentProcessingRequestInput, DocumentUploadResult } from '@qyou/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function submitDocumentProcessing(
  patientId: string,
  payload: DocumentProcessingRequestInput
): Promise<DocumentUploadResult> {
  const response = await fetch(`${API_BASE_URL}/api/patients/${patientId}/documents/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to process document attachment');
  }

  return (await response.json()) as DocumentUploadResult;
}
