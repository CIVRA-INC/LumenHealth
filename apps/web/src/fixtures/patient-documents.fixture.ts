import type { PatientDocument } from '@qyou/shared';

export const mockPatientDocumentsFixture: PatientDocument[] = [
  {
    id: 'doc_101',
    patientId: 'patient_001',
    title: 'Complete Blood Count (CBC) Report',
    category: 'lab_report',
    attachment: {
      fileName: 'cbc_report_2026.pdf',
      fileSizeBytes: 245000,
      mimeType: 'application/pdf',
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    },
    uploadedAt: '2026-07-25T10:00:00Z',
    notes: 'Normal WBC and RBC ranges.',
  },
];
