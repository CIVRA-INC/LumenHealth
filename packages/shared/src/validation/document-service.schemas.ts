import { z } from 'zod';

export const processingStatusSchema = z.enum(['pending', 'scanning', 'stored', 'rejected']);

export const documentServiceConfigSchema = z.object({
  maxAttachmentSizeBytes: z.number().int().positive().default(10485760),
  enableVirusScanning: z.boolean().default(true),
  allowedMimeTypes: z.array(z.string()).default(['application/pdf', 'image/png', 'image/jpeg']),
});

export const documentProcessingRequestSchema = z.object({
  documentId: z.string().min(1, 'Document ID is required.'),
  checksum: z.string().min(1, 'Checksum is required.'),
});

export type DocumentServiceConfigInput = z.infer<typeof documentServiceConfigSchema>;
export type DocumentProcessingRequestInput = z.infer<typeof documentProcessingRequestSchema>;
