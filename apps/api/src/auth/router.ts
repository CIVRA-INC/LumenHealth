import { Router } from "express";
import type { LoginRequest, LoginResponse, LogoutResponse, MeResponse } from "@lumen/types";

// Placeholder router — full implementation in subsequent auth milestones.
const router = Router();

router.post("/login", (req, res) => {
  const body = req.body as Partial<LoginRequest>;
  if (!body.email || !body.password) {
    res.status(400).json({ error: "AUTH_MISSING_CREDENTIALS", message: "email and password are required" });
    return;
  }
  const payload: LoginResponse = {
    session: {
      userId: "starter-user",
      clinicId: "starter-clinic",
      role: "owner",
      accessToken: "replace-in-milestone-1",
    },
  };
  res.json(payload);
});

router.post("/logout", (_req, res) => {
  const payload: LogoutResponse = { ok: true };
  res.json(payload);
});

router.get("/me", (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "AUTH_TOKEN_INVALID", message: "missing bearer token" });
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

export { router as authRouter };
