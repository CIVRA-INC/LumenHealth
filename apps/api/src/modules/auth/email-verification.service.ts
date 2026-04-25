import crypto from "crypto";
import { UserModel } from "./models/user.model";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_RESEND_ATTEMPTS = 3;

interface VerificationRecord {
  tokenHash: string;
  expiresAt: Date;
  attempts: number;
}

const pending = new Map<string, VerificationRecord>();

export const issueVerificationToken = (userId: string): string => {
  const existing = pending.get(userId);
  if (existing && existing.attempts >= MAX_RESEND_ATTEMPTS) {
    throw new Error("Max resend attempts reached. Try again later.");
  }

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  pending.set(userId, {
    tokenHash,
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    attempts: (existing?.attempts ?? 0) + 1,
  });

  return token;
};

export const verifyEmailToken = async (
  userId: string,
  token: string,
): Promise<boolean> => {
  const record = pending.get(userId);
  if (!record) return false;

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const isValid =
    record.tokenHash === tokenHash && record.expiresAt > new Date();

  if (!isValid) return false;

  await UserModel.findByIdAndUpdate(userId, { isActive: true });
  pending.delete(userId);
  return true;
};

export const getVerificationStatus = (
  userId: string,
): "pending" | "none" => (pending.has(userId) ? "pending" : "none");
