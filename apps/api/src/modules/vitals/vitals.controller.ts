import { Request, Response, Router } from "express";
import { authorize, Roles } from "../../middlewares/rbac.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import { calculateVitalsFlags } from "./vitals.flags";
import { VitalsModel } from "./models/vitals.model";
import { emitVitalsCreated } from "../ai/cds.events";
import { EncounterModel } from "../encounters/models/encounter.model";
import { PatientModel } from "../patients/models/patient.model";
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

const toAgeInYears = (dateOfBirth: Date) => {
  const now = new Date();
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const monthDelta = now.getMonth() - dateOfBirth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dateOfBirth.getDate())) {
    age -= 1;
  }

  return Math.max(age, 0);
};

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

    const encounter = await EncounterModel.findOne({
      _id: req.body.encounterId,
      clinicId,
    })
      .select({ patientId: 1 })
      .lean();

    if (!encounter) {
      return res.status(404).json({
        error: "NotFound",
        message: "Encounter not found",
      });
    }

    const patient = await PatientModel.findOne({
      _id: encounter.patientId,
      clinicId,
    })
      .select({ dateOfBirth: 1 })
      .lean();

    if (!patient?.dateOfBirth) {
      return res.status(400).json({
        error: "BadRequest",
        message: "Encounter patient record is required before saving vitals",
      });
    }

    const flags = calculateVitalsFlags(toAgeInYears(new Date(patient.dateOfBirth)), {
      bpSystolic: req.body.bpSystolic,
      bpDiastolic: req.body.bpDiastolic,
      heartRate: req.body.heartRate,
      temperature: req.body.temperature,
    });

    const created = await VitalsModel.create({
      encounterId: req.body.encounterId,
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
      encounterId: req.body.encounterId,
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
