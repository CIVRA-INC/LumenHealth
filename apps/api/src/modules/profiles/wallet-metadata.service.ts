import mongoose, { Schema, Document } from "mongoose";

// CHORD-057: wallet attachment metadata on artist profiles

export interface IWalletMetadata extends Document {
  artistId: string;
  walletAddress: string;
  network: "mainnet" | "testnet";
  verified: boolean;
  lastValidatedAt: Date | null;
  attachedAt: Date;
}

const WalletMetadataSchema = new Schema<IWalletMetadata>({
  artistId:        { type: String, required: true, unique: true },
  walletAddress:   { type: String, required: true, trim: true },
  network:         { type: String, enum: ["mainnet", "testnet"], default: "testnet" },
  verified:        { type: Boolean, default: false },
  lastValidatedAt: { type: Date, default: null },
  attachedAt:      { type: Date, default: Date.now },
});

export const WalletMetadata = mongoose.model<IWalletMetadata>("WalletMetadata", WalletMetadataSchema);

const STELLAR_ADDR_RE = /^G[A-Z2-7]{55}$/;

export async function attachWallet(
  artistId: string,
  walletAddress: string,
  network: "mainnet" | "testnet" = "testnet"
): Promise<{ ok: boolean; reason?: string }> {
  if (!STELLAR_ADDR_RE.test(walletAddress)) return { ok: false, reason: "invalid_address" };

  await WalletMetadata.findOneAndUpdate(
    { artistId },
    { walletAddress, network, verified: false, lastValidatedAt: null, attachedAt: new Date() },
    { upsert: true, new: true }
  );
  return { ok: true };
}

export async function markWalletVerified(artistId: string): Promise<boolean> {
  const result = await WalletMetadata.findOneAndUpdate(
    { artistId },
    { verified: true, lastValidatedAt: new Date() }
  );
  return result !== null;
}

export async function getWalletMetadata(artistId: string): Promise<IWalletMetadata | null> {
  return WalletMetadata.findOne({ artistId });
}
