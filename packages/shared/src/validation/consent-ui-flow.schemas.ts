import { z } from 'zod';

export const privacyPreferenceToggleSchema = z.object({
  scopeKey: z.string().min(1, 'Scope key is required.'),
  isEnabled: z.boolean(),
});

export const consentSignaturePayloadSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required.'),
  signatureDataUrl: z.string().min(1, 'Signature payload is required.'),
  toggles: z.array(privacyPreferenceToggleSchema).default([]),
});

export type ConsentSignaturePayloadInput = z.infer<typeof consentSignaturePayloadSchema>;
