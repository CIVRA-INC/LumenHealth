import { Router, Request, Response } from "express";
import mongoose, { Schema, Document } from "mongoose";

interface IPublicArtistProfile extends Document {
  slug: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  isLive: boolean;
  featuredMoments: string[];
  supporterCount: number;
  visibility: "public" | "hidden";
}

const PublicArtistProfileSchema = new Schema<IPublicArtistProfile>(
  {
    slug: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    bio: String,
    avatarUrl: String,
    bannerUrl: String,
    isLive: { type: Boolean, default: false },
    featuredMoments: [String],
    supporterCount: { type: Number, default: 0 },
    visibility: { type: String, enum: ["public", "hidden"], default: "public" },
  },
  { timestamps: true }
);

const ArtistProfile = mongoose.model<IPublicArtistProfile>("ArtistProfile", PublicArtistProfileSchema);

function toPublicView(doc: IPublicArtistProfile) {
  return {
    slug: doc.slug,
    displayName: doc.displayName,
    bio: doc.bio ?? null,
    avatarUrl: doc.avatarUrl ?? null,
    bannerUrl: doc.bannerUrl ?? null,
    isLive: doc.isLive,
    featuredMoments: doc.featuredMoments,
    supporterCount: doc.supporterCount,
  };
}

export const publicProfileRouter = Router();

publicProfileRouter.get("/:slug", async (req: Request, res: Response) => {
  const profile = await ArtistProfile.findOne({ slug: req.params.slug, visibility: "public" });
  if (!profile) return res.status(404).json({ error: "not_found" });
  return res.json({ profile: toPublicView(profile) });
});

publicProfileRouter.get("/", async (_req: Request, res: Response) => {
  const profiles = await ArtistProfile.find({ visibility: "public" }).limit(50).lean();
  return res.json({ profiles: profiles.map(toPublicView as any) });
});
