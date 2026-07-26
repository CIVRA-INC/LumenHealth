import { Router } from "express";
import { resolveAuthContext } from "../../../shared/middleware/auth-context.js";
import {
  list,
  getOne,
  create,
  patch,
} from "../controllers/patient-demographics.controller.js";

const router = Router();

router.get("/", resolveAuthContext, list);
router.get("/:patientId", resolveAuthContext, getOne);
router.post("/", resolveAuthContext, create);
router.patch("/:patientId", resolveAuthContext, patch);

export { router as patientDemographicsRouter };
