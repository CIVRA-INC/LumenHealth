import { Router } from "express";
import { resolveAuthContext } from "../../../shared/middleware/auth-context.js";
import { requirePermission } from "../../../shared/middleware/role-guard.js";
import { list, grant, revoke } from "../controllers/consent.controller.js";

const router = Router();

router.get(
  "/",
  resolveAuthContext,
  requirePermission("patient:read"),
  list,
);

router.post(
  "/",
  resolveAuthContext,
  requirePermission("patient:write"),
  grant,
);

router.delete(
  "/:consentId",
  resolveAuthContext,
  requirePermission("patient:write"),
  revoke,
);

export { router as consentRouter };
