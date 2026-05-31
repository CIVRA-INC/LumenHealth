import { Router } from "express";
import { randomUUID } from "node:crypto";
import type { LoginRequest, LoginResponse, LogoutResponse, MeResponse, RegisterRequest, RegisterResponse } from "@lumen/types";
import { authErrorStatus, normalizeAuthError } from "./errors.js";
import { authLogger } from "./logger.js";
import { getAuthMetricsSnapshot, incrementMetric } from "./metrics.js";
import { accessTokenSigner } from "./token-signer.js";
import { makeSession, sessionStore } from "./session-store.js";
import { validatePassword } from "./password-policy.js";
import { resolveAuthContext } from "./auth-context-middleware.js";
import { forbidden, unauthorized } from "./response-helpers.js";

// Placeholder router — full implementation in subsequent auth milestones.
const router = Router();
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const seenRefreshTokens = new Set<string>();
const resetTokens = new Map<string, { userId: string; expiresAt: number }>();
const verifyTokens = new Map<string, { userId: string; email: string; expiresAt: number }>();
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
  const pwdErr = validatePassword(body.password);
  if (pwdErr) {
    const err = { error: "AUTH_MISSING_CREDENTIALS" as const, message: pwdErr };
    res.status(400).json(err);
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

router.post("/password-reset/request", (req, res) => {
  if (limited(`recovery:${req.ip ?? "unknown"}`, 10)) {
    res.status(429).json({ error: "AUTH_RATE_LIMITED", message: "too many recovery requests" });
    return;
  }
  const email = (req.body as { email?: string }).email;
  if (!email) {
    res.status(400).json({ error: "AUTH_MISSING_CREDENTIALS", message: "email is required" });
    return;
  }
  const token = randomUUID();
  resetTokens.set(token, { userId: "starter-user", expiresAt: Date.now() + 15 * 60_000 });
  authLogger.info("auth.recovery.requested", { meta: { tokenPreview: token.slice(0, 8) } });
  res.json({ ok: true });
});

router.post("/password-reset/confirm", (req, res) => {
  const { token, password } = req.body as { token?: string; password?: string };
  if (!token || !password) {
    res.status(400).json({ error: "AUTH_MISSING_CREDENTIALS", message: "token and password are required" });
    return;
  }
  const pwdErr = validatePassword(password);
  if (pwdErr) {
    res.status(400).json({ error: "AUTH_MISSING_CREDENTIALS", message: pwdErr });
    return;
  }
  const reset = resetTokens.get(token);
  if (!reset || Date.now() > reset.expiresAt) {
    resetTokens.delete(token);
    res.status(401).json({ error: "AUTH_TOKEN_INVALID", message: "invalid or expired reset token" });
    return;
  }
  resetTokens.delete(token);
  authLogger.info("auth.recovery.completed", { userId: reset.userId });
  res.json({ ok: true });
});

router.post("/verify/request", (req, res) => {
  const email = (req.body as { email?: string }).email;
  if (!email) {
    res.status(400).json({ error: "AUTH_MISSING_CREDENTIALS", message: "email is required" });
    return;
  }
  const token = randomUUID();
  verifyTokens.set(token, { userId: "starter-user", email, expiresAt: Date.now() + 24 * 60 * 60_000 });
  res.json({ ok: true });
});

router.post("/verify/complete", (req, res) => {
  const token = (req.body as { token?: string }).token;
  if (!token) {
    res.status(400).json({ error: "AUTH_MISSING_CREDENTIALS", message: "token is required" });
    return;
  }
  const verify = verifyTokens.get(token);
  if (!verify || Date.now() > verify.expiresAt) {
    verifyTokens.delete(token);
    res.status(401).json({ error: "AUTH_TOKEN_INVALID", message: "invalid or expired verification token" });
    return;
  }
  verifyTokens.delete(token);
  res.json({ ok: true, email: verify.email, userId: verify.userId });
});

router.post("/login", (req, res) => {
  const requestId = req.header("x-request-id") ?? randomUUID();
  if (limited(`login:${req.ip ?? "unknown"}`, 10)) {
    const err = { error: "AUTH_RATE_LIMITED" as const, message: "too many login attempts" };
    incrementMetric("auth_login_failure_total");
    incrementMetric("auth_account_lockout_total");
    res.status(429).json(err);
    return;
  }
  const body = req.body as Partial<LoginRequest>;

  if (!body.email || typeof body.email !== "string" ||
      !body.password || typeof body.password !== "string") {
    const err = { error: "AUTH_MISSING_CREDENTIALS" as const, message: "email and password are required" };
    incrementMetric("auth_login_failure_total");
    authLogger.warn("auth.login.failure", { requestId, meta: { reason: err.error } });
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

  incrementMetric("auth_login_success_total");
  authLogger.info("auth.login.success", {
    requestId,
    userId: payload.session.userId,
    clinicId: payload.session.clinicId,
  });

  res.json(payload);
});

router.post("/refresh", (req, res) => {
  const requestId = req.header("x-request-id") ?? randomUUID();
  if (limited(`refresh:${req.ip ?? "unknown"}`, 20)) {
    const err = { error: "AUTH_RATE_LIMITED" as const, message: "too many refresh attempts" };
    incrementMetric("auth_refresh_failure_total");
    res.status(429).json(err);
    return;
  }
  const refreshToken = (req.body as { refreshToken?: string }).refreshToken;
  if (!refreshToken) {
    const err = { error: "AUTH_TOKEN_INVALID" as const, message: "refreshToken is required" };
    incrementMetric("auth_refresh_failure_total");
    res.status(authErrorStatus(err.error)).json(err);
    return;
  }
  const existing = sessionStore.findByRefreshToken(refreshToken);
  if (!existing) {
    if (seenRefreshTokens.has(refreshToken)) {
      authLogger.warn("auth.token.expired", { meta: { reason: "refresh_reuse_detected" } });
      authLogger.warn("auth.login.failure", { meta: { reason: "suspicious_reuse" } });
    }
    const err = { error: "AUTH_TOKEN_INVALID" as const, message: "invalid refresh token" };
    incrementMetric("auth_refresh_failure_total");
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
  incrementMetric("auth_refresh_success_total");
  authLogger.info("auth.token.refreshed", { requestId, userId: existing.userId, clinicId: existing.clinicId, meta: { fp: `${req.ip ?? "unknown"}:${req.headers["user-agent"] ?? "na"}` } });
  res.json({ ok: true, accessToken: nextAccess, refreshToken: nextRefresh });
});

router.get("/metrics", (_req, res) => {
  res.json({ ok: true, metrics: getAuthMetricsSnapshot() });
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

router.get("/me", requirePermission("auth:read"), (req, res) => {
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

router.get("/owner-only", resolveAuthContext, (req, res) => {
  if (!req.auth) return unauthorized(res);
  if (req.auth.role !== "owner") return forbidden(res, "owner role required");
  res.json({ ok: true, userId: req.auth.userId, clinicId: req.auth.clinicId });
});

// Catch-all error handler for auth routes
router.use((err: unknown, _req: import("express").Request, res: import("express").Response, _next: import("express").NextFunction) => {
  const normalized = normalizeAuthError(err);
  res.status(authErrorStatus(normalized.error)).json(normalized);
});

export { router as authRouter };
