import { Router, Request, Response } from "express";
import mongoose, { Schema, Document } from "mongoose";

interface ISlugReservation extends Document {
  slug: string;
  artistId: string;
  reservedAt: Date;
  expiresAt: Date;
}

const SlugReservationSchema = new Schema<ISlugReservation>({
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  artistId: { type: String, required: true },
  reservedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

const SlugReservation = mongoose.model<ISlugReservation>("SlugReservation", SlugReservationSchema);

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/;
const RESERVATION_TTL_MS = 15 * 60 * 1000; // 15 min

export async function reserveSlug(artistId: string, slug: string): Promise<{ ok: boolean; reason?: string }> {
  if (!SLUG_RE.test(slug)) return { ok: false, reason: "invalid_format" };

  const existing = await SlugReservation.findOne({ slug });
  if (existing && existing.artistId !== artistId && existing.expiresAt > new Date()) {
    return { ok: false, reason: "taken" };
  }

  await SlugReservation.findOneAndUpdate(
    { slug },
    { artistId, reservedAt: new Date(), expiresAt: new Date(Date.now() + RESERVATION_TTL_MS) },
    { upsert: true }
  );
  return { ok: true };
}

export async function isSlugAvailable(slug: string): Promise<boolean> {
  const hit = await SlugReservation.findOne({ slug, expiresAt: { $gt: new Date() } });
  return !hit;
}

export const slugRouter = Router();

slugRouter.post("/reserve", async (req: Request, res: Response) => {
  const { artistId, slug } = req.body as { artistId?: string; slug?: string };
  if (!artistId || !slug) return res.status(400).json({ error: "artistId and slug required" });
  const result = await reserveSlug(artistId, slug);
  return result.ok ? res.status(200).json({ reserved: true }) : res.status(409).json({ error: result.reason });
});

slugRouter.get("/available/:slug", async (req: Request, res: Response) => {
  const available = await isSlugAvailable(req.params.slug);
  return res.json({ available });
});
