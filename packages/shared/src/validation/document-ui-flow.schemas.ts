import { z } from 'zod';

export const documentUploadStepSchema = z.enum(['select_file', 'add_metadata', 'verifying', 'completed']);

export const documentPreviewRequestSchema = z.object({
  documentId: z.string().min(1, 'Document ID is required.'),
  requestedFormat: z.enum(['pdf', 'png', 'jpg', 'json']).default('pdf'),
});

export type DocumentPreviewRequestInput = z.infer<typeof documentPreviewRequestSchema>;
