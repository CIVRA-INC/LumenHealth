import { Router } from "express";
import { resolveAuthContext } from "../../../shared/middleware/auth-context.js";
import { send, accept, list, revoke } from "../controllers/invitation.controller.js";

const router = Router();

router.post("/", resolveAuthContext, send);
router.get("/", resolveAuthContext, list);
router.post("/accept", accept);
router.delete("/:invitationId", resolveAuthContext, revoke);

export { router as invitationRouter };
