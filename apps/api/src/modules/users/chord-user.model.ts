/**
 * CHORD-032: Canonical User schema for fan, artist, and admin personas.
 *
 * Extends the existing clinic-staff User model with three new personas
 * required by the CHORD music platform layer:
 *
 *   FAN    – end-user who discovers and tips artists
 *   ARTIST – creator who receives tips and manages a profile
 *   ADMIN  – platform operator with moderation and configuration access
 *
 * Design decisions:
 * - A single `chord_users` collection with a discriminator field (`persona`)
 *   keeps queries simple and avoids cross-collection joins.
 * - Auth identifiers (email + hashed password) are shared across all personas.
 * - Consent state and moderation status are first-class fields so they can be
 *   indexed and queried without application-level filtering.
 * - Profile references (artistProfileId, fanProfileId) are stored as ObjectId
 *   refs so the profile documents can evolve independently.
 */

import { Schema, Types, model, models } from "mongoose";

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

export const ChordPersonaValues = ["FAN", "ARTIST", "ADMIN"] as const;
export type ChordPersona = (typeof ChordPersonaValues)[number];

export const ConsentStateValues = ["PENDING", "ACCEPTED", "WITHDRAWN"] as const;
export type ConsentState = (typeof ConsentStateValues)[number];

export const ModerationStatusValues = ["ACTIVE", "WARNED", "SUSPENDED", "BANNED"] as const;
export type ModerationStatus = (typeof ModerationStatusValues)[number];

// ---------------------------------------------------------------------------
// Shared base interface
// ---------------------------------------------------------------------------

export interface ChordUserBase {
  /** Unique email address used for authentication */
  email: string;
  /** bcrypt-hashed password */
  passwordHash: string;
  /** Platform persona – determines which profile fields are populated */
  persona: ChordPersona;
  /** Whether the account has been email-verified */
  isVerified: boolean;
  /** Consent to platform terms of service */
  consentState: ConsentState;
  /** Date the user accepted the current ToS version */
  consentAcceptedAt?: Date;
  /** Moderation status set by ADMIN users */
  moderationStatus: ModerationStatus;
  /** Reason for the current moderation status (populated on WARNED/SUSPENDED/BANNED) */
  moderationNote?: string;
  /** Soft-delete flag */
  isActive: boolean;
  /** Password reset support */
  resetTokenHash?: string;
  resetTokenExpiresAt?: Date;
}

// ---------------------------------------------------------------------------
// Persona-specific extensions
// ---------------------------------------------------------------------------

export interface FanUser extends ChordUserBase {
  persona: "FAN";
  displayName: string;
  /** Reference to the fan's extended profile document */
  fanProfileId?: Types.ObjectId;
  /** Total XLM tipped across all artists (denormalised for leaderboard queries) */
  totalTippedXlm: number;
}

export interface ArtistUser extends ChordUserBase {
  persona: "ARTIST";
  stageName: string;
  /** Reference to the artist's extended profile document */
  artistProfileId?: Types.ObjectId;
  /** Whether the artist has completed Stellar KYC / wallet linking */
  stellarWalletLinked: boolean;
  /** Public Stellar address for receiving tips */
  stellarPublicKey?: string;
  /** Total XLM received across all tips (denormalised) */
  totalReceivedXlm: number;
}

export interface AdminUser extends ChordUserBase {
  persona: "ADMIN";
  /** Granular permission flags for platform operations */
  permissions: {
    canModerateUsers: boolean;
    canModerateContent: boolean;
    canManageFeatureFlags: boolean;
    canViewAuditLogs: boolean;
  };
}

export type ChordUser = FanUser | ArtistUser | AdminUser;

// ---------------------------------------------------------------------------
// Mongoose schema
// ---------------------------------------------------------------------------

const chordUserSchema = new Schema<ChordUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    persona: {
      type: String,
      enum: ChordPersonaValues,
      required: true,
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    consentState: {
      type: String,
      enum: ConsentStateValues,
      default: "PENDING",
      index: true,
    },
    consentAcceptedAt: {
      type: Date,
      default: undefined,
    },
    moderationStatus: {
      type: String,
      enum: ModerationStatusValues,
      default: "ACTIVE",
      index: true,
    },
    moderationNote: {
      type: String,
      default: undefined,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    resetTokenHash: {
      type: String,
      select: false,
      default: undefined,
    },
    resetTokenExpiresAt: {
      type: Date,
      select: false,
      default: undefined,
      index: true,
    },

    // --- FAN fields ---
    displayName: { type: String, trim: true },
    fanProfileId: { type: Schema.Types.ObjectId, ref: "FanProfile" },
    totalTippedXlm: { type: Number, default: 0, min: 0 },

    // --- ARTIST fields ---
    stageName: { type: String, trim: true },
    artistProfileId: { type: Schema.Types.ObjectId, ref: "ArtistProfile" },
    stellarWalletLinked: { type: Boolean, default: false },
    stellarPublicKey: { type: String, trim: true },
    totalReceivedXlm: { type: Number, default: 0, min: 0 },

    // --- ADMIN fields ---
    permissions: {
      canModerateUsers: { type: Boolean, default: false },
      canModerateContent: { type: Boolean, default: false },
      canManageFeatureFlags: { type: Boolean, default: false },
      canViewAuditLogs: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "chord_users",
  },
);

// ---------------------------------------------------------------------------
// Compound indexes for common query patterns
// ---------------------------------------------------------------------------

/** Fan leaderboard: top tippers */
chordUserSchema.index({ persona: 1, totalTippedXlm: -1 });

/** Artist discovery: active, verified artists */
chordUserSchema.index({ persona: 1, isVerified: 1, moderationStatus: 1 });

/** Moderation queue: users needing review */
chordUserSchema.index({ moderationStatus: 1, updatedAt: -1 });

/** Consent audit: users with pending consent */
chordUserSchema.index({ consentState: 1, createdAt: 1 });

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const ChordUserModel =
  models.ChordUser || model<ChordUser>("ChordUser", chordUserSchema);
