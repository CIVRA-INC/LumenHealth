import { Router } from "express";
import { resolveAuthContext } from "../../../shared/middleware/auth-context.js";
import { exportAuditLog, list, verify } from "../controllers/audit.controller.js";

const router = Router();

router.get("/", resolveAuthContext, list);
router.get("/export", resolveAuthContext, exportAuditLog);
router.get("/:auditId/verify", resolveAuthContext, verify);

export { router as auditRouter };
