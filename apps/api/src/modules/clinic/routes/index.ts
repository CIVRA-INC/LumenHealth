import { Router } from "express";
import { resolveAuthContext } from "../../../shared/middleware/auth-context.js";
import { requireClinicScope } from "../../../shared/middleware/clinic-scope.js";
import { create, get, update, archive } from "../controllers/clinic.controller.js";

const router = Router();

router.post("/", resolveAuthContext, create);
router.get("/:clinicId", resolveAuthContext, requireClinicScope("clinicId"), get);
router.patch("/:clinicId", resolveAuthContext, requireClinicScope("clinicId"), update);
router.delete("/:clinicId", resolveAuthContext, requireClinicScope("clinicId"), archive);

export { router as clinicRouter };
