import { Request, Response, Router } from "express";
import { z } from "zod";
import { validateRequest } from "../../middlewares/validate.middleware";

const router = Router();

const artistDraftSchema = z.object({
  stageName: z.string().min(2).max(80).optional(),
  genre: z.string().max(50).optional(),
  location: z.string().max(100).optional(),
  payoutWalletAddress: z.string().optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
});

type ArtistDraftDto = z.infer<typeof artistDraftSchema>;

type DraftRecord = ArtistDraftDto & {
  artistId: string;
  payoutReady: boolean;
  savedAt: string;
};

// In-memory draft store (replace with DB model)
const drafts = new Map<string, DraftRecord>();

function isPayoutReady(draft: ArtistDraftDto): boolean {
  return !!(draft.stageName && draft.payoutWalletAddress);
}

// POST /profiles/artist/draft - save or update draft (partial saves allowed)
router.post(
  "/artist/draft",
  validateRequest({ body: artistDraftSchema }),
  (req: Request<Record<string, string>, unknown, ArtistDraftDto>, res: Response) => {
    const artistId = (req as Request & { user?: { userId: string } }).user?.userId ?? "anonymous";
    const existing = drafts.get(artistId) ?? {};
    const merged: DraftRecord = {
      ...existing,
      ...req.body,
      artistId,
      payoutReady: isPayoutReady({ ...existing, ...req.body }),
      savedAt: new Date().toISOString(),
    };
    drafts.set(artistId, merged);
    return res.status(200).json({ status: "success", data: merged });
  },
);

// GET /profiles/artist/draft - retrieve current draft
router.get("/artist/draft", (req: Request, res: Response) => {
  const artistId = (req as Request & { user?: { userId: string } }).user?.userId ?? "anonymous";
  const draft = drafts.get(artistId);
  if (!draft) return res.status(404).json({ error: "Not Found", message: "No draft found" });
  return res.json({ status: "success", data: draft });
});

export const artistOnboardingRoutes = router;
