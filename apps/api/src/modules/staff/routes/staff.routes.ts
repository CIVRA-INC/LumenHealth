import { Router } from "express";
import { resolveAuthContext } from "../../../shared/middleware/auth-context.js";
import { list, updateRole } from "../controllers/staff.controller.js";

const router = Router();

router.get("/", resolveAuthContext, list);
router.patch("/:staffId/role", resolveAuthContext, updateRole);

export { router as staffRouter };
