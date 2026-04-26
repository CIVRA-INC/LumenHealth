import crypto from "crypto";
import { Keypair } from "@stellar/stellar-sdk";

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const challenges = new Map<string, { nonce: string; expiresAt: Date }>();

export const issueWalletChallenge = (publicKey: string): string => {
  try {
    Keypair.fromPublicKey(publicKey); // validates key format
  } catch {
    throw new Error("Invalid Stellar public key");
  }

  const nonce = crypto.randomBytes(32).toString("hex");
  challenges.set(publicKey, { nonce, expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS) });
  return nonce;
};

export const verifyWalletSignature = (
  publicKey: string,
  signedNonce: string,
): boolean => {
  const record = challenges.get(publicKey);
  if (!record || record.expiresAt < new Date()) {
    challenges.delete(publicKey);
    return false;
  }

  try {
    const keypair = Keypair.fromPublicKey(publicKey);
    const isValid = keypair.verify(
      Buffer.from(record.nonce, "hex"),
      Buffer.from(signedNonce, "base64"),
    );
    if (isValid) challenges.delete(publicKey);
    return isValid;
  } catch {
    return false;
  }
};

export const walletAuthEnabled = (): boolean =>
  process.env.WALLET_AUTH_ENABLED === "true";
