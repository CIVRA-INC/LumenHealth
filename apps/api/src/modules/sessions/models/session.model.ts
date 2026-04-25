import { Schema, Types, model, models } from 'mongoose';

export type SessionStatus = 'draft' | 'live' | 'ended' | 'cancelled';

export interface SessionDocument {
  artistId: Types.ObjectId;
  title: string;
  description?: string;
  status: SessionStatus;
  /** Stream key / RTMP identifier — only set when live */
  streamKey?: string;
  /** Public playback URL — set when live */
  playbackUrl?: string;
  /** Scheduled start time — set for draft sessions */
  scheduledAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
  /** Running viewer count — updated by socket events */
  viewerCount: number;
  /** Cumulative tip total in XLM */
  totalTipsXlm: string;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<SessionDocument>(
  {
    artistId: { type: Schema.Types.ObjectId, ref: 'ArtistProfile', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: {
      type: String,
      enum: ['draft', 'live', 'ended', 'cancelled'],
      default: 'draft',
      index: true,
    },
    streamKey: { type: String, trim: true },
    playbackUrl: { type: String, trim: true },
    scheduledAt: { type: Date },
    startedAt: { type: Date },
    endedAt: { type: Date },
    viewerCount: { type: Number, default: 0, min: 0 },
    totalTipsXlm: { type: String, default: '0' },
  },
  { timestamps: true, versionKey: false },
);

// Live session discovery: active sessions by artist
sessionSchema.index({ artistId: 1, status: 1 });
// Global live feed sorted by recency
sessionSchema.index({ status: 1, startedAt: -1 });
// Scheduled sessions upcoming feed
sessionSchema.index({ status: 1, scheduledAt: 1 });

export const SessionModel =
  models.Session || model<SessionDocument>('Session', sessionSchema);
