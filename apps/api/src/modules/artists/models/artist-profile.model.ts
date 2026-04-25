import { Schema, Types, model, models } from 'mongoose';

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';
export type PayoutStatus = 'not_ready' | 'ready' | 'suspended';

export interface ArtistProfileDocument {
  /** Reference to the canonical User document */
  userId: Types.ObjectId;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  genres: string[];
  /** Public Stellar wallet address for tip payouts */
  stellarAddress?: string;
  verificationStatus: VerificationStatus;
  payoutStatus: PayoutStatus;
  /** Denormalised follower count — updated by background job */
  followerCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const artistProfileSchema = new Schema<ArtistProfileDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    displayName: { type: String, required: true, trim: true },
    bio: { type: String, trim: true },
    avatarUrl: { type: String, trim: true },
    genres: { type: [String], default: [] },
    stellarAddress: { type: String, trim: true },
    verificationStatus: {
      type: String,
      enum: ['unverified', 'pending', 'verified', 'rejected'],
      default: 'unverified',
      index: true,
    },
    payoutStatus: {
      type: String,
      enum: ['not_ready', 'ready', 'suspended'],
      default: 'not_ready',
      index: true,
    },
    followerCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

// Discoverability: genre filter + active flag
artistProfileSchema.index({ genres: 1, isActive: 1 });
// Payout readiness lookup
artistProfileSchema.index({ payoutStatus: 1, verificationStatus: 1 });
// Full-text search on display name
artistProfileSchema.index({ displayName: 'text' });

export const ArtistProfileModel =
  models.ArtistProfile ||
  model<ArtistProfileDocument>('ArtistProfile', artistProfileSchema);
