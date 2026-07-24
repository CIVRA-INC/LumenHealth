import { Router } from "express";
import {
  requireInternalServiceToken,
  listUnanchored,
  submitAnchorResult,
} from "../controllers/internal-audit.controller.js";

const router = Router();

router.use(requireInternalServiceToken);
router.get("/unanchored", listUnanchored);
router.post("/anchor-result", submitAnchorResult);

export { router as internalAuditRouter };
