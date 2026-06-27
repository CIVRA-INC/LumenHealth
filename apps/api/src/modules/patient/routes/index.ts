import { Router } from "express";
import { resolveAuthContext } from "../../../shared/middleware/auth-context.js";
import { requirePermission } from "../../../shared/middleware/role-guard.js";
import {
  create,
  get,
  list,
  update,
  archive,
} from "../controllers/patient.controller.js";

const router = Router();

router.post(
  "/",
  resolveAuthContext,
  requirePermission("patient:write"),
  create,
);

router.get(
  "/",
  resolveAuthContext,
  requirePermission("patient:read"),
  list,
);

router.get(
  "/:patientId",
  resolveAuthContext,
  requirePermission("patient:read"),
  get,
);

router.patch(
  "/:patientId",
  resolveAuthContext,
  requirePermission("patient:write"),
  update,
);

router.delete(
  "/:patientId",
  resolveAuthContext,
  requirePermission("patient:write"),
  archive,
);

export { router as patientRouter };
