import crypto from "crypto";
import bcrypt from "bcryptjs";
import { UserModel } from "./models/user.model";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

const hashToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");

export const requestPasswordReset = async (
  email: string,
): Promise<string | null> => {
  // Return null for unknown emails to prevent enumeration
  const user = await UserModel.findOne(
    { email: email.toLowerCase().trim() },
    "+resetPasswordTokenHash +resetPasswordExpiresAt",
  );
  if (!user) return null;

  const token = crypto.randomBytes(32).toString("hex");

  await UserModel.findByIdAndUpdate(user._id, {
    resetPasswordTokenHash: hashToken(token),
    resetPasswordExpiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  });

  return token;
};

export const completePasswordReset = async (
  email: string,
  token: string,
  newPassword: string,
): Promise<boolean> => {
  const user = await UserModel.findOne(
    { email: email.toLowerCase().trim() },
    "+resetPasswordTokenHash +resetPasswordExpiresAt",
  );

  if (
    !user ||
    !user.resetPasswordTokenHash ||
    !user.resetPasswordExpiresAt ||
    user.resetPasswordExpiresAt < new Date() ||
    user.resetPasswordTokenHash !== hashToken(token)
  ) {
    return false;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await UserModel.findByIdAndUpdate(user._id, {
    password: passwordHash,
    $unset: { resetPasswordTokenHash: 1, resetPasswordExpiresAt: 1 },
  });

  return true;
};
