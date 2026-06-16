import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import type { LoginRequest, LoginResponse, LogoutResponse, MeResponse, RegisterRequest, RegisterResponse } from "@lumen/types";
import { authErrorStatus, normalizeAuthError } from "../../../shared/errors/index.js";
import { authLogger } from "../../../shared/logger/index.js";
import { unauthorized } from "../../../shared/middleware/response-helpers.js";
import { accessTokenSigner } from "../services/token.service.js";
import { makeSession, sessionStore } from "../repositories/session.repository.js";
import { identityStore } from "../repositories/identity.repository.js";
import { validatePassword } from "../validators/password.validator.js";
import { accountStatusError } from "../services/account-status.service.js";
import { incrementMetric, getAuthMetricsSnapshot } from "../services/metrics.service.js";

const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const seenRefreshTokens = new Set<string>();
const resetTokens = new Map<string, { userId: string; expiresAt: number }>();
const verifyTokens = new Map<string, { userId: string; email: string; expiresAt: number }>();

export function _resetAuthStateForTests(): void {
  rateBuckets.clear();
  seenRefreshTokens.clear();
  resetTokens.clear();
  verifyTokens.clear();
}

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

export async function register(req: Request, res: Response): Promise<void> {
  const body = req.body as Partial<RegisterRequest>;
  if (!body.email || typeof body.email !== "string" || !body.password || typeof body.password !== "string" || !body.clinicName) {
    res.status(400).json({ error: "AUTH_MISSING_CREDENTIALS", message: "email, password, and clinicName are required" });
    return;
  }
  const pwdErr = validatePassword(body.password);
  if (pwdErr) {
    res.status(400).json({ error: "AUTH_MISSING_CREDENTIALS", message: pwdErr });
    return;
  }
  if (identityStore.findByEmail(body.email)) {
    res.status(authErrorStatus("AUTH_EMAIL_TAKEN")).json({ error: "AUTH_EMAIL_TAKEN", message: "an account with that email already exists" });
    return;
  }
  const userId = randomUUID();
  const clinicId = randomUUID();
  const passwordHash = await bcrypt.hash(body.password, 12);
  identityStore.save({ userId, clinicId, email: body.email, passwordHash, role: "owner", status: "active", createdAt: new Date().toISOString() });
  const accessToken = accessTokenSigner.sign({ sub: userId, clinicId, role: "owner" });
  const refreshToken = randomUUID();
  sessionStore.save(makeSession({ sessionId: accessToken, userId, clinicId, accessToken, refreshToken }));
  const payload: RegisterResponse = { session: { userId, clinicId, role: "owner", accessToken } };
  res.status(201).json(payload);
}

export async function login(req: Request, res: Response): Promise<void> {
  const requestId = req.header("x-request-id") ?? randomUUID();
  if (limited(`login:${req.ip ?? "unknown"}`, 10)) {
    incrementMetric("auth_login_failure_total");
    incrementMetric("auth_account_lockout_total");
    res.status(429).json({ error: "AUTH_RATE_LIMITED", message: "too many login attempts" });
    return;
  }
  const body = req.body as Partial<LoginRequest>;
  if (!body.email || typeof body.email !== "string" || !body.password || typeof body.password !== "string") {
    incrementMetric("auth_login_failure_total");
    authLogger.warn("auth.login.failure", { requestId, meta: { reason: "AUTH_MISSING_CREDENTIALS" } });
    res.status(400).json({ error: "AUTH_MISSING_CREDENTIALS", message: "email and password are required" });
    return;
  }
  const identity = identityStore.findByEmail(body.email);
  if (!identity) {
    incrementMetric("auth_login_failure_total");
    authLogger.warn("auth.login.failure", { requestId, meta: { reason: "AUTH_INVALID_CREDENTIALS" } });
    res.status(authErrorStatus("AUTH_INVALID_CREDENTIALS")).json({ error: "AUTH_INVALID_CREDENTIALS", message: "invalid email or password" });
    return;
  }
  const statusErr = accountStatusError(identity.status);
  if (statusErr) {
    incrementMetric("auth_login_failure_total");
    res.status(authErrorStatus(statusErr.error)).json(statusErr);
    return;
  }
  const passwordMatch = await bcrypt.compare(body.password, identity.passwordHash);
  if (!passwordMatch) {
    incrementMetric("auth_login_failure_total");
    authLogger.warn("auth.login.failure", { requestId, meta: { reason: "AUTH_INVALID_CREDENTIALS" } });
    res.status(authErrorStatus("AUTH_INVALID_CREDENTIALS")).json({ error: "AUTH_INVALID_CREDENTIALS", message: "invalid email or password" });
    return;
  }
  const accessToken = accessTokenSigner.sign({ sub: identity.userId, clinicId: identity.clinicId, role: identity.role });
  const refreshToken = randomUUID();
  sessionStore.save(makeSession({ sessionId: accessToken, userId: identity.userId, clinicId: identity.clinicId, accessToken, refreshToken }));
  seenRefreshTokens.add(refreshToken);
  incrementMetric("auth_login_success_total");
  authLogger.info("auth.login.success", { requestId, userId: identity.userId, clinicId: identity.clinicId });
  const payload: LoginResponse = { session: { userId: identity.userId, clinicId: identity.clinicId, role: identity.role, accessToken } };
  res.json(payload);
}

export function logout(req: Request, res: Response): void {
  if (limited(`recovery:${req.ip ?? "unknown"}`, 30)) {
    res.status(429).json({ error: "AUTH_RATE_LIMITED", message: "too many auth requests" });
    return;
  }
  const payload: LogoutResponse = { ok: true };
  res.json(payload);
}

export function me(req: Request, res: Response): void {
  if (!req.auth) { unauthorized(res); return; }
  const identity = identityStore.findById(req.auth.userId);
  if (!identity) { unauthorized(res, "user not found"); return; }
  const payload: MeResponse = {
    userId: identity.userId,
    clinicId: identity.clinicId,
    role: identity.role,
    email: identity.email,
  };
  res.json(payload);
}

export function ownerOnly(req: Request, res: Response): void {
  if (!req.auth) { unauthorized(res); return; }
  if (req.auth.role !== "owner") {
    res.status(403).json({ error: "AUTH_FORBIDDEN", message: "owner role required" });
    return;
  }
  res.json({ ok: true, userId: req.auth.userId, clinicId: req.auth.clinicId });
}

export function refresh(req: Request, res: Response): void {
  const requestId = req.header("x-request-id") ?? randomUUID();
  if (limited(`refresh:${req.ip ?? "unknown"}`, 20)) {
    incrementMetric("auth_refresh_failure_total");
    res.status(429).json({ error: "AUTH_RATE_LIMITED", message: "too many refresh attempts" });
    return;
  }
  const refreshToken = (req.body as { refreshToken?: string }).refreshToken;
  if (!refreshToken) {
    incrementMetric("auth_refresh_failure_total");
    res.status(authErrorStatus("AUTH_TOKEN_INVALID")).json({ error: "AUTH_TOKEN_INVALID", message: "refreshToken is required" });
    return;
  }
  const existing = sessionStore.findByRefreshToken(refreshToken);
  if (!existing) {
    if (seenRefreshTokens.has(refreshToken)) {
      authLogger.warn("auth.token.expired", { meta: { reason: "refresh_reuse_detected" } });
      authLogger.warn("auth.login.failure", { meta: { reason: "suspicious_reuse" } });
    }
    incrementMetric("auth_refresh_failure_total");
    res.status(authErrorStatus("AUTH_TOKEN_INVALID")).json({ error: "AUTH_TOKEN_INVALID", message: "invalid refresh token" });
    return;
  }
  sessionStore.revokeByRefreshToken(refreshToken);
  const identity = identityStore.findById(existing.userId);
  const role = identity?.role ?? "owner";
  const nextAccess = accessTokenSigner.sign({ sub: existing.userId, clinicId: existing.clinicId, role });
  const nextRefresh = randomUUID();
  seenRefreshTokens.add(nextRefresh);
  sessionStore.save(makeSession({ sessionId: nextAccess, userId: existing.userId, clinicId: existing.clinicId, accessToken: nextAccess, refreshToken: nextRefresh }));
  incrementMetric("auth_refresh_success_total");
  authLogger.info("auth.token.refreshed", { requestId, userId: existing.userId, clinicId: existing.clinicId });
  res.json({ ok: true, accessToken: nextAccess, refreshToken: nextRefresh });
}

export function passwordResetRequest(req: Request, res: Response): void {
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
  const identity = identityStore.findByEmail(email);
  if (identity) {
    resetTokens.set(token, { userId: identity.userId, expiresAt: Date.now() + 15 * 60_000 });
  }
  authLogger.info("auth.recovery.requested", { meta: { tokenPreview: token.slice(0, 8) } });
  res.json({ ok: true });
}

export function passwordResetConfirm(req: Request, res: Response): void {
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
}

export function verifyRequest(req: Request, res: Response): void {
  const email = (req.body as { email?: string }).email;
  if (!email) {
    res.status(400).json({ error: "AUTH_MISSING_CREDENTIALS", message: "email is required" });
    return;
  }
  const token = randomUUID();
  const identity = identityStore.findByEmail(email);
  if (identity) {
    verifyTokens.set(token, { userId: identity.userId, email, expiresAt: Date.now() + 24 * 60 * 60_000 });
  }
  res.json({ ok: true });
}

export function verifyComplete(req: Request, res: Response): void {
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
}

export function metrics(_req: Request, res: Response): void {
  res.json({ ok: true, metrics: getAuthMetricsSnapshot() });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: import("express").NextFunction
): void {
  const normalized = normalizeAuthError(err);
  res.status(authErrorStatus(normalized.error)).json(normalized);
}
