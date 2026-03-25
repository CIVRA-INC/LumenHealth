import { Request, Response, Router } from "express";
import { authorize, Roles } from "../../middlewares/rbac.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import { DiagnosisModel } from "./models/diagnosis.model";
import { Icd10CodeModel } from "./models/icd10-code.model";
import {
  AttachDiagnosisDto,
  DiagnosisSearchQueryDto,
  EncounterDiagnosisParamsDto,
  attachDiagnosisSchema,
  diagnosisSearchQuerySchema,
  encounterDiagnosisParamsSchema,
  diagnosisIdParamsSchema,
  updateDiagnosisStatusSchema,
} from "./diagnoses.validation";
import { EncounterModel } from "../encounters/models/encounter.model";

const router = Router();
const ALL_ROLES: Roles[] = Object.values(Roles);
const CLINICAL_ROLES: Roles[] = [Roles.SUPER_ADMIN, Roles.CLINIC_ADMIN, Roles.DOCTOR, Roles.NURSE];

type SearchRequest = Request<Record<string, string>, unknown, unknown, DiagnosisSearchQueryDto>;
type AttachDiagnosisRequest = Request<
  EncounterDiagnosisParamsDto,
  unknown,
  AttachDiagnosisDto
>;

router.get(
  "/diagnoses/search",
  authorize(ALL_ROLES),
  validateRequest({ query: diagnosisSearchQuerySchema }),
  async (req: SearchRequest, res: Response) => {
    const query = req.query.q.trim();

    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const [textHits, regexHits] = await Promise.all([
      Icd10CodeModel.find(
        { $text: { $search: query } },
        { score: { $meta: "textScore" }, code: 1, description: 1 },
      )
        .sort({ score: { $meta: "textScore" } })
        .limit(12)
        .lean(),
      Icd10CodeModel.find(
        {
          $or: [{ code: { $regex: regex } }, { description: { $regex: regex } }],
        },
        { code: 1, description: 1 },
      )
        .limit(12)
        .lean(),
    ]);

    const merged = [...textHits, ...regexHits];
    const seen = new Set<string>();

    const data = merged
      .filter((item) => {
        if (seen.has(item.code)) {
          return false;
        }
        seen.add(item.code);
        return true;
      })
      .slice(0, 15)
      .map((item) => ({
        code: item.code,
        description: item.description,
      }));

    return res.json({
      status: "success",
      data,
    });
  },
);

router.post(
  "/encounters/:encounterId/diagnoses",
  authorize(CLINICAL_ROLES),
  validateRequest({ params: encounterDiagnosisParamsSchema, body: attachDiagnosisSchema }),
  async (req: AttachDiagnosisRequest, res: Response) => {
    const userId = req.user?.userId;
    const clinicId = req.user?.clinicId;

    if (!userId || !clinicId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    // CHANGE 1 — Encounter existence validation
    const encounter = await EncounterModel.findOne({
      _id: req.params.encounterId,
      clinicId,
    }).lean();

    if (!encounter) {
      return res.status(404).json({
        error: "Encounter not found",
        code: "ENCOUNTER_NOT_FOUND",
      });
    }

    // CHANGE 2 — Encounter ownership validation
    const isOwner = encounter.patientId === userId || encounter.providerId === userId;
    if (!isOwner) {
      return res.status(403).json({
        error: "Not authorized for this encounter",
        code: "ENCOUNTER_FORBIDDEN",
      });
    }

    // CHANGE 3 — Duplicate diagnosis prevention
    const existing = await DiagnosisModel.findOne({
      encounterId: req.params.encounterId,
      code: req.body.code,
    }).lean();

    if (existing) {
      return res.status(200).json({
        status: "success",
        data: {
          id: String(existing._id),
          encounterId: existing.encounterId,
          code: existing.code,
          description: existing.description,
          status: existing.status,
          createdAt: (existing as any).createdAt,
          updatedAt: (existing as any).updatedAt,
        },
        duplicate: true,
      });
    }

    const diagnosis = await DiagnosisModel.create({
      clinicId,
      encounterId: req.params.encounterId,
      code: req.body.code,
      description: req.body.description,
      status: req.body.status,
    });

    return res.status(201).json({
      status: "success",
      data: {
        id: String(diagnosis._id),
        encounterId: diagnosis.encounterId,
        code: diagnosis.code,
        description: diagnosis.description,
        status: diagnosis.status,
        createdAt: (diagnosis as any).createdAt,
        updatedAt: (diagnosis as any).updatedAt,
      },
    });
  },
);

// CHANGE 4 — Status update endpoint
router.patch(
  "/diagnoses/:id/status",
  authorize(CLINICAL_ROLES),
  validateRequest({ params: diagnosisIdParamsSchema, body: updateDiagnosisStatusSchema }),
  async (req, res) => {
    const userId = req.user?.userId;
    const clinicId = req.user?.clinicId;

    if (!userId || !clinicId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    const diagnosis = await DiagnosisModel.findById(req.params.id);
    if (!diagnosis) {
      return res.status(404).json({
        error: "Diagnosis not found",
        code: "DIAGNOSIS_NOT_FOUND",
      });
    }

    const encounter = await EncounterModel.findOne({
      _id: diagnosis.encounterId,
      clinicId,
    }).lean();

    if (!encounter) {
      return res.status(404).json({
        error: "Associated encounter not found",
        code: "ENCOUNTER_NOT_FOUND",
      });
    }

    const isOwner = encounter.patientId === userId || encounter.providerId === userId;
    if (!isOwner) {
      return res.status(403).json({
        error: "Not authorized for this encounter",
        code: "ENCOUNTER_FORBIDDEN",
      });
    }

    diagnosis.status = req.body.status;
    await diagnosis.save();

    return res.json({
      status: "success",
      data: {
        id: String(diagnosis._id),
        encounterId: diagnosis.encounterId,
        code: diagnosis.code,
        description: diagnosis.description,
        status: diagnosis.status,
        updatedAt: (diagnosis as any).updatedAt,
      },
    });
  },
);

// CHANGE 5 — List diagnoses for encounter
router.get(
  "/encounters/:encounterId/diagnoses",
  authorize(ALL_ROLES),
  validateRequest({ params: encounterDiagnosisParamsSchema }),
  async (req, res) => {
    const userId = req.user?.userId;
    const clinicId = req.user?.clinicId;

    if (!userId || !clinicId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    const encounter = await EncounterModel.findOne({
      _id: req.params.encounterId,
      clinicId,
    }).lean();

    if (!encounter) {
      return res.status(404).json({
        error: "Encounter not found",
        code: "ENCOUNTER_NOT_FOUND",
      });
    }

    const isOwner = encounter.patientId === userId || encounter.providerId === userId;
    if (!isOwner) {
      return res.status(403).json({
        error: "Not authorized for this encounter",
        code: "ENCOUNTER_FORBIDDEN",
      });
    }

    const diagnoses = await DiagnosisModel.find({
      encounterId: req.params.encounterId,
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      status: "success",
      data: diagnoses.map((d) => ({
        id: String(d._id),
        code: d.code,
        description: d.description,
        status: d.status,
        createdAt: (d as any).createdAt,
        updatedAt: (d as any).updatedAt,
      })),
    });
  },
);

export const diagnosisRoutes = router;
