import { Router } from "express";
import { randomUUID } from "node:crypto";
import type { LoginRequest, LoginResponse, LogoutResponse, MeResponse, RegisterRequest, RegisterResponse } from "@lumen/types";
import { authErrorStatus, normalizeAuthError } from "./errors.js";
import { authLogger } from "./logger.js";
import { accessTokenSigner } from "./token-signer.js";
import { makeSession, sessionStore } from "./session-store.js";

// Placeholder router — full implementation in subsequent auth milestones.
const router = Router();
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const seenRefreshTokens = new Set<string>();
function limited(key: string, limit: number, windowMs = 60_000): boolean {
  const now = Date.now();
  const b = rateBuckets.get(key);
  if (!b || now > b.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  b.count += 1;
  return b.count > limit;
}

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
      accessToken: accessTokenSigner.sign({ sub: "new-user", clinicId: "new-clinic", role: "owner" }),
    },
  };
  res.status(201).json(payload);
});

router.post("/login", (req, res) => {
  if (limited(`login:${req.ip ?? "unknown"}`, 10)) {
    const err = { error: "AUTH_RATE_LIMITED" as const, message: "too many login attempts" };
    res.status(429).json(err);
    return;
  }
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
      accessToken: accessTokenSigner.sign({ sub: "starter-user", clinicId: "starter-clinic", role: "owner" }),
    },
  };
  const refreshToken = randomUUID();
  sessionStore.save(
    makeSession({
      sessionId: payload.session.accessToken,
      userId: payload.session.userId,
      clinicId: payload.session.clinicId,
      accessToken: payload.session.accessToken,
      refreshToken,
    })
  );
  seenRefreshTokens.add(refreshToken);

  authLogger.info("auth.login.success", {
    userId: payload.session.userId,
    clinicId: payload.session.clinicId,
  });

  res.json(payload);
});

router.post("/refresh", (req, res) => {
  if (limited(`refresh:${req.ip ?? "unknown"}`, 20)) {
    const err = { error: "AUTH_RATE_LIMITED" as const, message: "too many refresh attempts" };
    res.status(429).json(err);
    return;
  }
  const refreshToken = (req.body as { refreshToken?: string }).refreshToken;
  if (!refreshToken) {
    const err = { error: "AUTH_TOKEN_INVALID" as const, message: "refreshToken is required" };
    res.status(authErrorStatus(err.error)).json(err);
    return;
  }
  const existing = sessionStore.findByRefreshToken(refreshToken);
  if (!existing) {
    if (seenRefreshTokens.has(refreshToken)) {
      authLogger.warn("auth.token.expired", { meta: { reason: "refresh_reuse_detected" } });
    }
    const err = { error: "AUTH_TOKEN_INVALID" as const, message: "invalid refresh token" };
    res.status(authErrorStatus(err.error)).json(err);
    return;
  }
  sessionStore.revokeByRefreshToken(refreshToken);
  const nextRefresh = randomUUID();
  seenRefreshTokens.add(nextRefresh);
  const nextAccess = accessTokenSigner.sign({ sub: existing.userId, clinicId: existing.clinicId, role: "owner" });
  sessionStore.save(
    makeSession({
      sessionId: nextAccess,
      userId: existing.userId,
      clinicId: existing.clinicId,
      accessToken: nextAccess,
      refreshToken: nextRefresh,
    })
  );
  authLogger.info("auth.token.refreshed", { userId: existing.userId, clinicId: existing.clinicId, meta: { fp: `${req.ip ?? "unknown"}:${req.headers["user-agent"] ?? "na"}` } });
  res.json({ ok: true, accessToken: nextAccess, refreshToken: nextRefresh });
});

router.post("/logout", (_req, res) => {
  if (limited(`recovery:${_req.ip ?? "unknown"}`, 30)) {
    const err = { error: "AUTH_RATE_LIMITED" as const, message: "too many auth requests" };
    res.status(429).json(err);
    return;
  }
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
