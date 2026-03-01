import { Request, Response, Router } from "express";
import { authorize, Roles } from "../../middlewares/rbac.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import {
  createPatient,
  getPatientById,
  searchPatients,
} from "./patients.service";
import {
  CreatePatientDto,
  createPatientSchema,
  PatientIdParamsDto,
  patientIdParamsSchema,
  PatientSearchQueryDto,
  patientSearchQuerySchema,
} from "./patients.validation";

const router = Router();
const ALL_ROLES: Roles[] = Object.values(Roles);

type CreatePatientRequest = Request<Record<string, string>, unknown, CreatePatientDto>;
type SearchPatientsRequest = Request<
  Record<string, string>,
  unknown,
  unknown,
  PatientSearchQueryDto
>;
type GetPatientByIdRequest = Request<PatientIdParamsDto>;

router.post(
  "/",
  authorize(ALL_ROLES),
  validateRequest({ body: createPatientSchema }),
  async (req: CreatePatientRequest, res: Response) => {
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    const patient = await createPatient({
      payload: req.body,
      clinicId,
    });

    return res.status(201).json({
      status: "success",
      data: patient,
    });
  },
);

router.get(
  "/search",
  authorize(ALL_ROLES),
  validateRequest({ query: patientSearchQuerySchema }),
  async (req: SearchPatientsRequest, res: Response) => {
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    const results = await searchPatients(req.query.q, clinicId);

    return res.json({
      status: "success",
      data: results,
    });
  },
);

router.get(
  "/:id",
  authorize(ALL_ROLES),
  validateRequest({ params: patientIdParamsSchema }),
  async (req: GetPatientByIdRequest, res: Response) => {
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    const patient = await getPatientById(req.params.id, clinicId);
    if (!patient) {
      return res.status(404).json({
        error: "NotFound",
        message: "Patient not found",
      });
    }

    return res.json({
      status: "success",
      data: patient,
    });
  },
);

export const patientRoutes = router;
