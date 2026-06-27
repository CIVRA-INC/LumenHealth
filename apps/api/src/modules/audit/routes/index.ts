import { Router } from "express";
import { resolveAuthContext } from "../../../shared/middleware/auth-context.js";
import { list } from "../controllers/audit.controller.js";

const router = Router();

router.get("/", resolveAuthContext, list);

export { router as auditRouter };
