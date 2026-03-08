import { Request, Response, Router } from "express";
import { authorize, Roles } from "../../middlewares/rbac.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import { verifyAccessToken } from "../auth/token.service";
import { emitQueueUpdate, subscribeQueueUpdates } from "./queue.events";
import { QueueEncounterModel } from "./models/queue-encounter.model";
import {
  QueueStreamQueryDto,
  RouteQueueEncounterBodyDto,
  RouteQueueEncounterParamsDto,
  queueStreamQuerySchema,
  routeQueueEncounterBodySchema,
  routeQueueEncounterParamsSchema,
} from "./queue.validation";

const router = Router();
const ALL_ROLES: Roles[] = Object.values(Roles);

type RouteQueueEncounterRequest = Request<
  RouteQueueEncounterParamsDto,
  unknown,
  RouteQueueEncounterBodyDto
>;
type QueueStreamRequest = Request<Record<string, string>, unknown, unknown, QueueStreamQueryDto>;

const startOfDay = (date: Date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const endOfDay = (date: Date) => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

const buildMockQueueRows = (clinicId: string) => {
  const now = Date.now();
  return [
    {
      clinicId,
      patientName: "Amina Kato",
      systemId: "LMN-2041",
      queueStatus: "WAITING" as const,
      encounterStatus: "OPEN" as const,
      openedAt: new Date(now - 22 * 60_000),
    },
    {
      clinicId,
      patientName: "John Okello",
      systemId: "LMN-2042",
      queueStatus: "WAITING" as const,
      encounterStatus: "OPEN" as const,
      openedAt: new Date(now - 14 * 60_000),
    },
    {
      clinicId,
      patientName: "Sarah Ninsiima",
      systemId: "LMN-2043",
      queueStatus: "TRIAGE" as const,
      encounterStatus: "IN_PROGRESS" as const,
      openedAt: new Date(now - 9 * 60_000),
    },
    {
      clinicId,
      patientName: "David Mugisha",
      systemId: "LMN-2044",
      queueStatus: "CONSULTATION" as const,
      encounterStatus: "IN_PROGRESS" as const,
      openedAt: new Date(now - 31 * 60_000),
    },
    {
      clinicId,
      patientName: "Mercy Atwine",
      systemId: "LMN-2045",
      queueStatus: "TRIAGE" as const,
      encounterStatus: "IN_PROGRESS" as const,
      openedAt: new Date(now - 5 * 60_000),
    },
  ];
};

const ensureQueueSeed = async (clinicId: string) => {
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const existingCount = await QueueEncounterModel.countDocuments({
    clinicId,
    openedAt: { $gte: todayStart, $lte: todayEnd },
    encounterStatus: { $in: ["OPEN", "IN_PROGRESS"] },
  });

  if (existingCount > 0) {
    return;
  }

  await QueueEncounterModel.insertMany(buildMockQueueRows(clinicId));
};

const toPayload = (doc: {
  _id: unknown;
  patientName: string;
  systemId: string;
  queueStatus: "WAITING" | "TRIAGE" | "CONSULTATION";
  encounterStatus: "OPEN" | "IN_PROGRESS" | "CLOSED";
  openedAt: Date;
}) => ({
  id: String(doc._id),
  patientName: doc.patientName,
  systemId: doc.systemId,
  queueStatus: doc.queueStatus,
  encounterStatus: doc.encounterStatus,
  openedAt: doc.openedAt.toISOString(),
  waitMinutes: Math.max(0, Math.floor((Date.now() - doc.openedAt.getTime()) / 60_000)),
});

router.get("/today", authorize(ALL_ROLES), async (req: Request, res: Response) => {
  const clinicId = req.user?.clinicId;
  if (!clinicId) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Authentication required",
    });
  }

  await ensureQueueSeed(clinicId);

  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const rows = await QueueEncounterModel.find({
    clinicId,
    openedAt: { $gte: todayStart, $lte: todayEnd },
    encounterStatus: { $in: ["OPEN", "IN_PROGRESS"] },
  })
    .sort({ openedAt: 1 })
    .lean();

  return res.json({
    status: "success",
    data: rows.map((row) => toPayload(row as Parameters<typeof toPayload>[0])),
  });
});

router.get(
  "/stream",
  validateRequest({ query: queueStreamQuerySchema }),
  async (req: QueueStreamRequest, res: Response) => {
    const user = verifyAccessToken(req.query.token);
    if (!user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid or expired token",
      });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);

    subscribeQueueUpdates(user.clinicId, res);
  },
);

router.patch(
  "/:id/route",
  authorize(ALL_ROLES),
  validateRequest({ params: routeQueueEncounterParamsSchema, body: routeQueueEncounterBodySchema }),
  async (req: RouteQueueEncounterRequest, res: Response) => {
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    const updated = await QueueEncounterModel.findOneAndUpdate(
      { _id: req.params.id, clinicId, encounterStatus: { $in: ["OPEN", "IN_PROGRESS"] } },
      {
        $set: {
          queueStatus: req.body.queueStatus,
          encounterStatus: req.body.queueStatus === "CONSULTATION" ? "IN_PROGRESS" : "OPEN",
        },
      },
      { new: true },
    ).lean();

    if (!updated) {
      return res.status(404).json({
        error: "NotFound",
        message: "Queue item not found",
      });
    }

    const payload = toPayload(updated as Parameters<typeof toPayload>[0]);
    emitQueueUpdate(clinicId, { type: "queue.updated", item: payload });

    return res.json({
      status: "success",
      data: payload,
    });
  },
);

export const queueRoutes = router;
