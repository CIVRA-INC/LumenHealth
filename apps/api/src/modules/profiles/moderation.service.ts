import mongoose, { Schema, Document } from "mongoose";

// CHORD-058: profile moderation fields and controls

export type ModerationState = "clear" | "under_review" | "shadow_restricted" | "hidden";

export interface IModerationRecord extends Document {
  profileId: string;
  state: ModerationState;
  reason: string | null;
  reviewedBy: string | null;
  updatedAt: Date;
}

const ModerationRecordSchema = new Schema<IModerationRecord>({
  profileId:  { type: String, required: true, unique: true },
  state:      { type: String, enum: ["clear", "under_review", "shadow_restricted", "hidden"], default: "clear" },
  reason:     { type: String, default: null },
  reviewedBy: { type: String, default: null },
  updatedAt:  { type: Date, default: Date.now },
});

export const ModerationRecord = mongoose.model<IModerationRecord>("ModerationRecord", ModerationRecordSchema);

export async function setModerationState(
  profileId: string,
  state: ModerationState,
  adminId: string,
  reason?: string
): Promise<IModerationRecord> {
  const doc = await ModerationRecord.findOneAndUpdate(
    { profileId },
    { state, reason: reason ?? null, reviewedBy: adminId, updatedAt: new Date() },
    { upsert: true, new: true }
  );
  return doc!;
}

export async function getModerationState(profileId: string): Promise<ModerationState> {
  const doc = await ModerationRecord.findOne({ profileId });
  return doc?.state ?? "clear";
}

/** Returns true when the profile is publicly visible */
export function isPubliclyVisible(state: ModerationState): boolean {
  return state === "clear" || state === "under_review";
}

export async function isProfileVisible(profileId: string): Promise<boolean> {
  const state = await getModerationState(profileId);
  return isPubliclyVisible(state);
}
