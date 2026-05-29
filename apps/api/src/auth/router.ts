import { Router } from "express";
import type { LoginRequest, LoginResponse, LogoutResponse, MeResponse, RegisterRequest, RegisterResponse } from "@lumen/types";
import { authErrorStatus, normalizeAuthError } from "./errors.js";
import { authLogger } from "./logger.js";

// Placeholder router — full implementation in subsequent auth milestones.
const router = Router();

router.post("/register", (req, res) => {
  const body = req.body as Partial<RegisterRequest>;
  if (!body.email || !body.password || !body.clinicName) {
    const err = { error: "AUTH_MISSING_CREDENTIALS" as const, message: "email, password, and clinicName are required" };
    res.status(authErrorStatus(err.error)).json(err);
    return;
  }
  // Stub — real uniqueness check and password hashing in milestone 1
  const payload: RegisterResponse = {
    session: {
      userId: "new-user",
      clinicId: "new-clinic",
      role: "owner",
      accessToken: "replace-in-milestone-1",
    },
  };
  res.status(201).json(payload);
});

router.post("/login", (req, res) => {
  const body = req.body as Partial<LoginRequest>;

  if (!body.email || typeof body.email !== "string" ||
      !body.password || typeof body.password !== "string") {
    const err = { error: "AUTH_MISSING_CREDENTIALS" as const, message: "email and password are required" };
    authLogger.warn("auth.login.failure", { meta: { reason: err.error } });
    res.status(authErrorStatus(err.error)).json(err);
    return;
  }

  // Stub — real credential lookup and password verification in milestone 1
  const payload: LoginResponse = {
    session: {
      userId: "starter-user",
      clinicId: "starter-clinic",
      role: "owner",
      accessToken: "replace-in-milestone-1",
    },
  };

  authLogger.info("auth.login.success", {
    userId: payload.session.userId,
    clinicId: payload.session.clinicId,
  });

  res.json(payload);
});

router.post("/logout", (_req, res) => {
  const payload: LogoutResponse = { ok: true };
  res.json(payload);
});

router.get("/me", (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    const err = { error: "AUTH_TOKEN_INVALID" as const, message: "missing bearer token" };
    res.status(authErrorStatus(err.error)).json(err);
    return;
  }
  // Stub — real JWT validation in milestone 1
  const payload: MeResponse = {
    userId: "starter-user",
    clinicId: "starter-clinic",
    role: "owner",
    email: "owner@clinic.test",
  };
  res.json(payload);
});

// Catch-all error handler for auth routes
router.use((err: unknown, _req: import("express").Request, res: import("express").Response, _next: import("express").NextFunction) => {
  const normalized = normalizeAuthError(err);
  res.status(authErrorStatus(normalized.error)).json(normalized);
});

export { router as authRouter };
