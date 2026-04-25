/**
 * CHORD-032: Zod validation schemas for CHORD user registration and updates.
 *
 * These schemas enforce the same constraints as the Mongoose model at the
 * HTTP boundary so invalid payloads are rejected before hitting the database.
 */

import { z } from "zod";
import { ChordPersonaValues, ConsentStateValues, ModerationStatusValues } from "./chord-user.model";

// ---------------------------------------------------------------------------
// Shared base
// ---------------------------------------------------------------------------

const baseRegistrationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  consentState: z.enum(ConsentStateValues).default("PENDING"),
});

// ---------------------------------------------------------------------------
// Fan registration
// ---------------------------------------------------------------------------

export const registerFanSchema = baseRegistrationSchema.extend({
  persona: z.literal("FAN"),
  displayName: z.string().trim().min(1).max(50),
});

export type RegisterFanDto = z.infer<typeof registerFanSchema>;

// ---------------------------------------------------------------------------
// Artist registration
// ---------------------------------------------------------------------------

export const registerArtistSchema = baseRegistrationSchema.extend({
  persona: z.literal("ARTIST"),
  stageName: z.string().trim().min(1).max(80),
  stellarPublicKey: z
    .string()
    .regex(/^G[A-Z2-7]{54}$/, "Must be a valid Stellar public key (G… 55 chars)")
    .optional(),
});

export type RegisterArtistDto = z.infer<typeof registerArtistSchema>;

// ---------------------------------------------------------------------------
// Admin creation (internal – not exposed via public registration endpoint)
// ---------------------------------------------------------------------------

export const createAdminSchema = baseRegistrationSchema.extend({
  persona: z.literal("ADMIN"),
  permissions: z
    .object({
      canModerateUsers: z.boolean().default(false),
      canModerateContent: z.boolean().default(false),
      canManageFeatureFlags: z.boolean().default(false),
      canViewAuditLogs: z.boolean().default(false),
    })
    .default({
      canModerateUsers: false,
      canModerateContent: false,
      canManageFeatureFlags: false,
      canViewAuditLogs: false,
    }),
});

export type CreateAdminDto = z.infer<typeof createAdminSchema>;

// ---------------------------------------------------------------------------
// Union registration schema (used by the public /register endpoint)
// ---------------------------------------------------------------------------

export const registerChordUserSchema = z.discriminatedUnion("persona", [
  registerFanSchema,
  registerArtistSchema,
]);

export type RegisterChordUserDto = z.infer<typeof registerChordUserSchema>;

// ---------------------------------------------------------------------------
// Moderation update (ADMIN only)
// ---------------------------------------------------------------------------

export const moderateUserSchema = z.object({
  moderationStatus: z.enum(ModerationStatusValues),
  moderationNote: z.string().trim().max(500).optional(),
});

export type ModerateUserDto = z.infer<typeof moderateUserSchema>;

// ---------------------------------------------------------------------------
// Consent update
// ---------------------------------------------------------------------------

export const updateConsentSchema = z.object({
  consentState: z.enum(["ACCEPTED", "WITHDRAWN"] as const),
});

export type UpdateConsentDto = z.infer<typeof updateConsentSchema>;
