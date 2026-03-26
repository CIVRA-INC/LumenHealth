import { Request, Response, Router } from "express";
import { authorize, Roles } from "../../middlewares/rbac.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import { findClinicEncounter } from "../clinics/ownership.service";
import { DiagnosisModel } from "./models/diagnosis.model";
import { Icd10CodeModel } from "./models/icd10-code.model";
import {
  AttachDiagnosisDto,
  DiagnosisSearchQueryDto,
  EncounterDiagnosisParamsDto,
  attachDiagnosisSchema,
  diagnosisSearchQuerySchema,
  encounterDiagnosisParamsSchema,
} from "./diagnoses.validation";

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
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    const encounter = await findClinicEncounter(clinicId, req.params.encounterId);
    if (!encounter) {
      return res.status(404).json({
        error: "NotFound",
        message: "Encounter not found",
      });
    }

    const diagnosis = await DiagnosisModel.findOneAndUpdate(
      {
        clinicId,
        encounterId: req.params.encounterId,
        code: req.body.code,
      },
      {
        $set: {
          description: req.body.description,
          status: req.body.status,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    ).lean();

    return res.status(201).json({
      status: "success",
      data: {
        id: String(diagnosis?._id),
        encounterId: diagnosis?.encounterId,
        code: diagnosis?.code,
        description: diagnosis?.description,
        status: diagnosis?.status,
      },
    });
  },
);

export const diagnosisRoutes = router;
