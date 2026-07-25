import { z } from 'zod';

export const accessLevelSchema = z.enum(['public_read', 'restricted_practitioner', 'confidential_patient']);

export const storagePolicySchema = z.object({
  retentionDays: z.number().int().positive().default(365),
  encryptedAtRest: z.boolean().default(true),
  backupRegion: z.string().default('us-east-1'),
});

export const documentAccessControlSchema = z.object({
  documentId: z.string().min(1, 'Document ID is required.'),
  accessLevel: accessLevelSchema,
  authorizedRoles: z.array(z.string()).min(1, 'At least one role must be specified.'),
});

export type DocumentAccessControlInput = z.infer<typeof documentAccessControlSchema>;
export type StoragePolicyInput = z.infer<typeof storagePolicySchema>;
