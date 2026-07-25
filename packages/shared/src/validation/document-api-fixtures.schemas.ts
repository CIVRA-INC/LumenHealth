import { z } from 'zod';

export const mockAttachmentResponseSchema = z.object({
  attachmentId: z.string().min(1, 'Attachment ID is required.'),
  originalFileName: z.string().min(1, 'File name is required.'),
  storagePath: z.string().min(1, 'Storage path is required.'),
  status: z.enum(['valid', 'corrupted', 'quarantined']),
});

export const apiDocumentFixtureSchema = z.object({
  fixtureId: z.string().min(1),
  description: z.string().min(1),
  mockAttachment: mockAttachmentResponseSchema,
});

export type ApiDocumentFixtureInput = z.infer<typeof apiDocumentFixtureSchema>;
