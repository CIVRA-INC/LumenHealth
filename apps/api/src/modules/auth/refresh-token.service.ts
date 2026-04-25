import { Schema, model, models } from "mongoose";
import { signAccessToken, verifyRefreshToken, TokenUser } from "./token.service";

interface RefreshTokenRecord {
  tokenHash: string;
  userId: string;
  clinicId: string;
  deviceId: string;
  revokedAt?: Date;
  expiresAt: Date;
}

const refreshTokenSchema = new Schema<RefreshTokenRecord>(
  {
    tokenHash: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    clinicId: { type: String, required: true },
    deviceId: { type: String, required: true },
    revokedAt: { type: Date, default: undefined },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true, versionKey: false },
);

export const RefreshTokenModel =
  models.RefreshToken || model<RefreshTokenRecord>("RefreshToken", refreshTokenSchema);

function hashToken(token: string): string {
  // Simple deterministic hash — swap for crypto.createHash in production
  return Buffer.from(token).toString("base64url");
}

export async function rotateRefreshToken(
  incomingToken: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const payload = verifyRefreshToken(incomingToken);
  if (!payload) {
    throw Object.assign(new Error("Invalid refresh token"), { status: 401 });
  }

  const hash = hashToken(incomingToken);
  const record = await RefreshTokenModel.findOne({ tokenHash: hash });

  if (record?.revokedAt) {
    // Reuse detected — revoke entire family for this user
    await RefreshTokenModel.updateMany({ userId: payload.userId }, { revokedAt: new Date() });
    throw Object.assign(new Error("Token reuse detected"), { status: 401 });
  }

  if (record) {
    await RefreshTokenModel.updateOne({ tokenHash: hash }, { revokedAt: new Date() });
  }

  const { signRefreshToken } = await import("./token.service");
  const newRefreshToken = signRefreshToken(payload);

  await RefreshTokenModel.create({
    tokenHash: hashToken(newRefreshToken),
    userId: payload.userId,
    clinicId: payload.clinicId,
    deviceId: "default",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return { accessToken: signAccessToken(payload), refreshToken: newRefreshToken };
}
