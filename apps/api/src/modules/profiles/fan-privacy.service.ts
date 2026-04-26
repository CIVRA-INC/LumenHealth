import mongoose, { Schema, Document } from "mongoose";

// CHORD-059: fan privacy controls for leaderboard display names

export type LeaderboardVisibility = "real_name" | "pseudonym" | "anonymous";

export interface IFanPrivacySettings extends Document {
  fanId: string;
  leaderboardVisibility: LeaderboardVisibility;
  pseudonym: string | null;
  /** Per-session overrides: sessionId → visibility */
  sessionOverrides: Map<string, LeaderboardVisibility>;
  updatedAt: Date;
}

const FanPrivacySchema = new Schema<IFanPrivacySettings>({
  fanId:                 { type: String, required: true, unique: true },
  leaderboardVisibility: { type: String, enum: ["real_name", "pseudonym", "anonymous"], default: "real_name" },
  pseudonym:             { type: String, default: null, trim: true, maxlength: 32 },
  sessionOverrides:      { type: Map, of: String, default: {} },
  updatedAt:             { type: Date, default: Date.now },
});

export const FanPrivacySettings = mongoose.model<IFanPrivacySettings>("FanPrivacySettings", FanPrivacySchema);

export async function updatePrivacySettings(
  fanId: string,
  visibility: LeaderboardVisibility,
  pseudonym?: string
): Promise<IFanPrivacySettings> {
  const doc = await FanPrivacySettings.findOneAndUpdate(
    { fanId },
    { leaderboardVisibility: visibility, pseudonym: pseudonym ?? null, updatedAt: new Date() },
    { upsert: true, new: true }
  );
  return doc!;
}

export async function setSessionOverride(
  fanId: string,
  sessionId: string,
  visibility: LeaderboardVisibility
): Promise<void> {
  await FanPrivacySettings.findOneAndUpdate(
    { fanId },
    { $set: { [`sessionOverrides.${sessionId}`]: visibility }, updatedAt: new Date() },
    { upsert: true }
  );
}

export async function resolveDisplayName(
  fanId: string,
  realName: string,
  sessionId?: string
): Promise<string> {
  const settings = await FanPrivacySettings.findOne({ fanId });
  const visibility = (sessionId && settings?.sessionOverrides.get(sessionId))
    || settings?.leaderboardVisibility
    || "real_name";
  if (visibility === "anonymous") return "Anonymous";
  if (visibility === "pseudonym") return settings?.pseudonym ?? "Anonymous";
  return realName;
}
