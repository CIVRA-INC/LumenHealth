import { Request, Response, Router } from "express";
import { authorize, Roles } from "../../middlewares/rbac.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import { calculateVitalsFlags } from "./vitals.flags";
import { VitalsModel } from "./models/vitals.model";
import { emitVitalsCreated } from "../ai/cds.events";
import {
  CreateVitalsDto,
  EncounterVitalsParamsDto,
  createVitalsSchema,
  encounterVitalsParamsSchema,
} from "./vitals.validation";

const router = Router();
const ALL_ROLES: Roles[] = Object.values(Roles);

type CreateVitalsRequest = Request<Record<string, string>, unknown, CreateVitalsDto>;
type EncounterVitalsRequest = Request<EncounterVitalsParamsDto>;

const toPayload = (doc: {
  _id: unknown;
  encounterId: string;
  authorId: string;
  timestamp: Date;
  bpSystolic: number;
  bpDiastolic: number;
  heartRate: number;
  temperature: number;
  respirationRate: number;
  spO2: number;
  weight: number;
  flags: string[];
}) => ({
  id: String(doc._id),
  encounterId: doc.encounterId,
  authorId: doc.authorId,
  timestamp: doc.timestamp.toISOString(),
  bpSystolic: doc.bpSystolic,
  bpDiastolic: doc.bpDiastolic,
  heartRate: doc.heartRate,
  temperature: doc.temperature,
  respirationRate: doc.respirationRate,
  spO2: doc.spO2,
  weight: doc.weight,
  flags: doc.flags,
});

router.post(
  "/",
  authorize(ALL_ROLES),
  validateRequest({ body: createVitalsSchema }),
  async (req: CreateVitalsRequest, res: Response) => {
    const clinicId = req.user?.clinicId;
    const authorId = req.user?.userId;

    if (!clinicId || !authorId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    const mockPatientAge = 45;
    const flags = calculateVitalsFlags(mockPatientAge, {
      bpSystolic: req.body.bpSystolic,
      bpDiastolic: req.body.bpDiastolic,
      heartRate: req.body.heartRate,
      temperature: req.body.temperature,
    });

    const created = await VitalsModel.create({
      encounterId: req.body.encounterId ?? "mock-enc-123",
      authorId,
      clinicId,
      timestamp: new Date(),
      bpSystolic: req.body.bpSystolic,
      bpDiastolic: req.body.bpDiastolic,
      heartRate: req.body.heartRate,
      temperature: req.body.temperature,
      respirationRate: req.body.respirationRate,
      spO2: req.body.spO2,
      weight: req.body.weight,
      flags,
    });

    // Trigger CDS processing asynchronously so API response path stays fast.
    emitVitalsCreated({
      clinicId,
      encounterId: req.body.encounterId ?? "mock-enc-123",
      vitalsId: String(created._id),
    });

    return res.status(201).json({
      status: "success",
      data: toPayload(created.toObject() as Parameters<typeof toPayload>[0]),
    });
  },
);

router.get(
  "/encounter/:encounterId",
  authorize(ALL_ROLES),
  validateRequest({ params: encounterVitalsParamsSchema }),
  async (req: EncounterVitalsRequest, res: Response) => {
    const clinicId = req.user?.clinicId;

    if (!clinicId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    const vitals = await VitalsModel.find({
      clinicId,
      encounterId: req.params.encounterId,
    })
      .sort({ timestamp: -1 })
      .lean();

    return res.json({
      status: "success",
      data: vitals.map((entry) => toPayload(entry as Parameters<typeof toPayload>[0])),
    });
  },
);

export const vitalsRoutes = router;
