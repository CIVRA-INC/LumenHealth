import { Request, Response, Router } from "express";
import { authorize, Roles } from "../../middlewares/rbac.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import { getPatientHistory } from "./history.service";
import {
  PatientHistoryParamsDto,
  PatientHistoryQueryDto,
  patientHistoryParamsSchema,
  patientHistoryQuerySchema,
} from "./history.validation";

const router = Router();
const ALL_ROLES: Roles[] = Object.values(Roles);

type PatientHistoryRequest = Request<
  PatientHistoryParamsDto,
  unknown,
  unknown,
  Record<string, unknown>
>;

router.get(
  "/:id/history",
  authorize(ALL_ROLES),
  validateRequest({ params: patientHistoryParamsSchema, query: patientHistoryQuerySchema }),
  async (req: PatientHistoryRequest, res: Response) => {
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    const query = req.query as PatientHistoryQueryDto;

    const payload = await getPatientHistory({
      patientId: req.params.id,
      clinicId,
      page: query.page,
      limit: query.limit,
    });

    if (!payload) {
      return res.status(404).json({
        error: "NotFound",
        message: "Patient not found",
      });
    }

    return res.json({
      status: "success",
      data: payload.patient,
      encounters: payload.encounters,
      meta: payload.meta,
    });
  },
);

export const patientHistoryRoutes = router;
