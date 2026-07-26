import { Router } from "express";
import { resolveAuthContext } from "../../../shared/middleware/auth-context.js";
import { requirePermission } from "../../../shared/middleware/role-guard.js";
import {
  getDemographics,
  updateDemographics,
  createPatient,
  listPatients,
} from "../controllers/patient-demographics.controller.js";

const router = Router();

router.use(resolveAuthContext);

router.get("/patients", requirePermission("patient:read"), listPatients);
router.post("/patients", requirePermission("patient:write"), createPatient);
router.get("/patients/:patientId/demographics", requirePermission("patient:read"), getDemographics);
router.patch("/patients/:patientId/demographics", requirePermission("patient:write"), updateDemographics);

export { router as patientDemographicsRouter };
