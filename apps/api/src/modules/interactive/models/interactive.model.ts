import { Schema, Types, model, models } from 'mongoose';

// ── Moment ─────────────────────────────────────────────────────────────────────
// A timestamped highlight clipped from a live session.
// Forward-compatible: created during a session, voteable after it ends.

export type MomentStatus = 'active' | 'archived';

export interface MomentDocument {
  sessionId: Types.ObjectId;
  artistId: Types.ObjectId;
  /** Offset in seconds from session start */
  offsetSeconds: number;
  title: string;
  thumbnailUrl?: string;
  /** Clip playback URL — may be null until processing completes */
  clipUrl?: string;
  status: MomentStatus;
  /** Denormalised vote tally — updated by Vote writes */
  voteCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const momentSchema = new Schema<MomentDocument>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true, index: true },
    artistId: { type: Schema.Types.ObjectId, ref: 'ArtistProfile', required: true, index: true },
    offsetSeconds: { type: Number, required: true, min: 0 },
    title: { type: String, required: true, trim: true },
    thumbnailUrl: { type: String, trim: true },
    clipUrl: { type: String, trim: true },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
      index: true,
    },
    voteCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, versionKey: false },
);

// Top moments per session sorted by votes
momentSchema.index({ sessionId: 1, voteCount: -1 });
// Artist's moment library
momentSchema.index({ artistId: 1, status: 1, createdAt: -1 });

export const MomentModel =
  models.Moment || model<MomentDocument>('Moment', momentSchema);

// ── Vote ───────────────────────────────────────────────────────────────────────
// One vote per fan per moment — enforced by unique compound index.

export interface VoteDocument {
  momentId: Types.ObjectId;
  fanId: Types.ObjectId;
  sessionId: Types.ObjectId;
  createdAt: Date;
}

const voteSchema = new Schema<VoteDocument>(
  {
    momentId: { type: Schema.Types.ObjectId, ref: 'Moment', required: true, index: true },
    fanId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

// One vote per fan per moment
voteSchema.index({ momentId: 1, fanId: 1 }, { unique: true });
// Fan's voting history per session
voteSchema.index({ fanId: 1, sessionId: 1 });

export const VoteModel =
  models.Vote || model<VoteDocument>('Vote', voteSchema);

// ── Unlock ─────────────────────────────────────────────────────────────────────
// Records that a fan has unlocked premium content (e.g. exclusive clip)
// by meeting a tip threshold or purchasing directly.

export type UnlockType = 'tip_threshold' | 'direct_purchase';

export interface UnlockDocument {
  fanId: Types.ObjectId;
  momentId: Types.ObjectId;
  sessionId: Types.ObjectId;
  type: UnlockType;
  /** Reference to the TipTransaction that triggered this unlock, if applicable */
  transactionId?: Types.ObjectId;
  createdAt: Date;
}

const unlockSchema = new Schema<UnlockDocument>(
  {
    fanId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    momentId: { type: Schema.Types.ObjectId, ref: 'Moment', required: true, index: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true, index: true },
    type: {
      type: String,
      enum: ['tip_threshold', 'direct_purchase'],
      required: true,
    },
    transactionId: { type: Schema.Types.ObjectId, ref: 'TipTransaction' },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

// One unlock per fan per moment
unlockSchema.index({ fanId: 1, momentId: 1 }, { unique: true });
// Fan's unlocked content per session
unlockSchema.index({ fanId: 1, sessionId: 1 });

export const UnlockModel =
  models.Unlock || model<UnlockDocument>('Unlock', unlockSchema);
