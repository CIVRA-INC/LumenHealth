import { RefreshTokenModel } from "./refresh-token.service";

export type RevocationScope = "device" | "all";

export interface RevocationResult {
  scope: RevocationScope;
  revokedCount: number;
}

function hashToken(token: string): string {
  return Buffer.from(token).toString("base64url");
}

export async function revokeSession(
  userId: string,
  refreshToken: string,
  scope: RevocationScope = "device",
): Promise<RevocationResult> {
  if (scope === "all") {
    const result = await RefreshTokenModel.updateMany(
      { userId, revokedAt: { $exists: false } },
      { revokedAt: new Date() },
    );
    return { scope: "all", revokedCount: result.modifiedCount };
  }

  const hash = hashToken(refreshToken);
  const result = await RefreshTokenModel.updateOne(
    { tokenHash: hash, userId, revokedAt: { $exists: false } },
    { revokedAt: new Date() },
  );

  return { scope: "device", revokedCount: result.modifiedCount };
}

export async function isSessionRevoked(refreshToken: string): Promise<boolean> {
  const hash = hashToken(refreshToken);
  const record = await RefreshTokenModel.findOne({ tokenHash: hash });
  return record?.revokedAt != null;
}

export async function purgeExpiredSessions(userId: string): Promise<number> {
  const result = await RefreshTokenModel.deleteMany({
    userId,
    expiresAt: { $lt: new Date() },
  });
  return result.deletedCount;
}
