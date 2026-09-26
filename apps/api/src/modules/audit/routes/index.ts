import { Router } from "express";
import { resolveAuthContext } from "../../../shared/middleware/auth-context.js";
import { anchoringHealth, verify, verifyExport } from "../controllers/audit.controller.js";

const router = Router();

router.get("/anchoring-health", resolveAuthContext, anchoringHealth);
router.get("/:auditId/verify", resolveAuthContext, verify);

// Public, unauthenticated: re-verifying an export bundle needs no LumenHealth
// account — see app.ts for this route's larger request-body limit.
router.post("/verify-export", verifyExport);

export { router as auditRouter };
