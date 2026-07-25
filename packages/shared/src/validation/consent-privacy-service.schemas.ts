import { z } from 'zod';

export const consentGrantPayloadSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required.'),
  scope: z.string().min(1, 'Scope is required.'),
  agreedToTerms: z.boolean().refine((val) => val === true, 'Terms agreement is required.'),
  signedTimestamp: z.string().min(1),
});

export const consentRevocationRequestSchema = z.object({
  consentId: z.string().min(1, 'Consent ID is required.'),
  patientId: z.string().min(1, 'Patient ID is required.'),
  reason: z.string().optional(),
});

export type ConsentGrantPayloadInput = z.infer<typeof consentGrantPayloadSchema>;
export type ConsentRevocationRequestInput = z.infer<typeof consentRevocationRequestSchema>;
