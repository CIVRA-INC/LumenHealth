import { z } from 'zod';

export const documentCategorySchema = z.enum([
  'lab_report',
  'prescription',
  'imaging',
  'discharge_summary',
  'other',
]);

export const attachmentMetadataSchema = z.object({
  fileName: z.string().min(1, 'File name is required.'),
  fileSizeBytes: z.number().int().positive('File size must be positive.'),
  mimeType: z.string().min(1, 'MIME type is required.'),
  checksum: z.string().min(1, 'Checksum is required.'),
});

export const uploadPatientDocumentSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required.'),
  title: z.string().trim().min(2, 'Document title is required.').max(150),
  category: documentCategorySchema,
  attachment: attachmentMetadataSchema,
  notes: z.string().max(500).optional(),
});

export type UploadPatientDocumentInput = z.infer<typeof uploadPatientDocumentSchema>;
