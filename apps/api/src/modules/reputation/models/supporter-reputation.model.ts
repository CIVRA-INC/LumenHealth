import { Schema, Types, model, models } from "mongoose";

// --- Badge sub-document ---
export interface Badge {
  id: string;
  name: string;
  description: string;
  awardedAt: Date;
}

const badgeSchema = new Schema<Badge>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    awardedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

// --- Streak sub-document ---
export interface Streak {
  type: string; // e.g. "daily_tip", "weekly_support"
  current: number;
  longest: number;
  lastActivityAt: Date;
}

const streakSchema = new Schema<Streak>(
  {
    type: { type: String, required: true },
    current: { type: Number, default: 0, min: 0 },
    longest: { type: Number, default: 0, min: 0 },
    lastActivityAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

// --- Root document ---
export interface SupporterReputation {
  userId: Types.ObjectId;
  /** Per-artist reputation points keyed by artistId string */
  artistPoints: Map<string, number>;
  /** Global aggregate points */
  totalPoints: number;
  level: number;
  badges: Badge[];
  streaks: Streak[];
}

const supporterReputationSchema = new Schema<SupporterReputation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    artistPoints: {
      type: Map,
      of: Number,
      default: {},
    },
    totalPoints: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
      index: true,
    },
    badges: { type: [badgeSchema], default: [] },
    streaks: { type: [streakSchema], default: [] },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const SupporterReputationModel =
  models.SupporterReputation ||
  model<SupporterReputation>(
    "SupporterReputation",
    supporterReputationSchema,
  );
