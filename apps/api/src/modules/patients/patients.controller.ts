import { Request, Response, Router } from "express";
import {
  notFoundProblem,
  unauthorizedProblem,
} from "../../core/problem";
import { authorize, Roles } from "../../middlewares/rbac.middleware";
import { getRequestContext } from "../../middlewares/request-context.middleware";
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
    const clinicId = getRequestContext(req).clinicId;
    if (!clinicId) {
      throw unauthorizedProblem();
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
    const clinicId = getRequestContext(req).clinicId;
    if (!clinicId) {
      throw unauthorizedProblem();
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
    const clinicId = getRequestContext(req).clinicId;
    if (!clinicId) {
      throw unauthorizedProblem();
    }

    const patient = await getPatientById(req.params.id, clinicId);
    if (!patient) {
      throw notFoundProblem("Patient not found");
    }

    return res.json({
      status: "success",
      data: patient,
    });
  },
);

export const patientRoutes = router;
