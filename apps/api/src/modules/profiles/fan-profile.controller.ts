import { Request, Response, Router } from "express";
import { z } from "zod";
import { validateRequest } from "../../middlewares/validate.middleware";

const router = Router();

const fanProfileSchema = z.object({
  displayName: z.string().min(2).max(50),
  bio: z.string().max(300).optional(),
  avatarUrl: z.string().url().optional(),
  notificationsEnabled: z.boolean().default(true),
  isPrivate: z.boolean().default(false),
});

type FanProfileDto = z.infer<typeof fanProfileSchema>;

// In-memory store (replace with DB model)
const profiles = new Map<string, FanProfileDto & { userId: string; updatedAt: string }>();

type ProfileRequest = Request<{ userId?: string }, unknown, FanProfileDto>;

// POST /profiles/fan - create fan profile
router.post(
  "/fan",
  validateRequest({ body: fanProfileSchema }),
  (req: ProfileRequest, res: Response) => {
    const userId = (req as Request & { user?: { userId: string } }).user?.userId ?? "anonymous";
    const profile = { ...req.body, userId, updatedAt: new Date().toISOString() };
    profiles.set(userId, profile);
    return res.status(201).json({ status: "success", data: profile });
  },
);

// PATCH /profiles/fan/:userId - update fan profile
router.patch(
  "/fan/:userId",
  validateRequest({ body: fanProfileSchema.partial() }),
  (req: Request<{ userId: string }, unknown, Partial<FanProfileDto>>, res: Response) => {
    const { userId } = req.params;
    const existing = profiles.get(userId);
    if (!existing) return res.status(404).json({ error: "Not Found", message: "Profile not found" });

    const updated = { ...existing, ...req.body, updatedAt: new Date().toISOString() };
    profiles.set(userId, updated);
    return res.json({ status: "success", data: updated });
  },
);

// GET /profiles/fan/:userId - read-safe public view
router.get("/fan/:userId", (req: Request<{ userId: string }>, res: Response) => {
  const profile = profiles.get(req.params.userId);
  if (!profile) return res.status(404).json({ error: "Not Found", message: "Profile not found" });
  const { isPrivate, ...publicView } = profile;
  return res.json({ status: "success", data: isPrivate ? { userId: profile.userId } : publicView });
});

export const fanProfileRoutes = router;
