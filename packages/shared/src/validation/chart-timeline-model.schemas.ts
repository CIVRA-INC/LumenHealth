import { z } from 'zod';

export const eventAttachmentRefSchema = z.object({
  attachmentId: z.string().min(1, 'Attachment ID is required.'),
  label: z.string().min(1, 'Label is required.'),
  url: z.string().min(1, 'URL is required.'),
});

export const clinicalEventNodeSchema = z.object({
  nodeId: z.string().min(1, 'Node ID is required.'),
  patientId: z.string().min(1, 'Patient ID is required.'),
  eventType: z.string().min(1, 'Event type is required.'),
  heading: z.string().min(1, 'Heading is required.'),
  recordedAt: z.string().min(1),
  attachments: z.array(eventAttachmentRefSchema).optional(),
});

export type ClinicalEventNodeInput = z.infer<typeof clinicalEventNodeSchema>;
