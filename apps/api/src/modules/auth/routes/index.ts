import { Router } from "express";
import { resolveAuthContext } from "../../../shared/middleware/auth-context.js";
import {
  register,
  login,
  logout,
  me,
  ownerOnly,
  refresh,
  passwordResetRequest,
  passwordResetConfirm,
  verifyRequest,
  verifyComplete,
  metrics,
  errorHandler,
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh", refresh);
router.post("/password-reset/request", passwordResetRequest);
router.post("/password-reset/confirm", passwordResetConfirm);
router.post("/verify/request", verifyRequest);
router.post("/verify/complete", verifyComplete);
router.get("/metrics", metrics);
router.get("/me", resolveAuthContext, me);
router.get("/owner-only", resolveAuthContext, ownerOnly);

router.use(errorHandler);

export { router as authRouter };
