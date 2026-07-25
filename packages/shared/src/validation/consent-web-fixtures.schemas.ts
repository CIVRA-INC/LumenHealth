import { z } from 'zod';

export const mockPrivacyPreferencePayloadSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required.'),
  analyticsSharing: z.boolean(),
  marketingOptIn: z.boolean(),
  medicalResearchOptIn: z.boolean(),
});

export const webConsentTestFixtureSchema = z.object({
  fixtureId: z.string().min(1),
  preferences: mockPrivacyPreferencePayloadSchema,
});

export type MockPrivacyPreferencePayloadInput = z.infer<typeof mockPrivacyPreferencePayloadSchema>;
export type WebConsentTestFixtureInput = z.infer<typeof webConsentTestFixtureSchema>;
