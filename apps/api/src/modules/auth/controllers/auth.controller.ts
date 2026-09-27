import { Controller, Post, Get, Body, Res, HttpException, HttpStatus, UseGuards, Headers, Ip } from '@nestjs/common';
import type { Response } from 'express';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import type { UserRole, LoginResponse, LogoutResponse, MeResponse } from '@lumen/types';

import { identityStore } from '../repositories/identity.repository.js';
import { sessionStore } from '../repositories/session.repository.js';
import { accessTokenSigner } from '../services/token.service.js';
import { accountStatusError, authErrorStatus, normalizeAuthError } from '../utils/errors.js';
import { validatePassword } from '../utils/validators.js';
import { makeSession } from '../utils/session.factory.js';
import { authLogger } from '../utils/logger.js';
import { incrementMetric, getAuthMetricsSnapshot } from '../utils/metrics.js';
import { limited } from '../utils/rate-limiter.js';
import { AuthGuard } from '../guards/auth.guard.js';
import { AuthContext } from '../../../shared/decorators/auth-context.decorator.js';
import type { AuthContextType } from '../../../shared/types/auth-context.js';

const seenRefreshTokens = new Set<string>();
const resetTokens = new Map<string, { userId: string; expiresAt: number }>();
const verifyTokens = new Map<string, { userId: string; email: string; expiresAt: number }>();

export function _resetAuthStateForTests() {
  seenRefreshTokens.clear();
  resetTokens.clear();
  verifyTokens.clear();
}

@Controller('auth')
export class AuthController {
  
  @Post('login')
  async login(
    @Body() body: any,
    @Headers('x-request-id') reqId: string,
    @Ip() ip: string,
    @Res() res: Response
  ) {
    const requestId = reqId ?? randomUUID();
    
    if (limited(`login:${ip ?? "unknown"}`, 10)) {
      incrementMetric("auth_login_failure_total");
      authLogger.warn("auth.login.failure", { requestId, meta: { reason: "AUTH_RATE_LIMITED" } });
      throw new HttpException({ error: "AUTH_RATE_LIMITED", message: "too many login attempts" }, HttpStatus.TOO_MANY_REQUESTS);
    }
    
    if (!body || !body.email || !body.password) {
      incrementMetric("auth_login_failure_total");
      authLogger.warn("auth.login.failure", { requestId, meta: { reason: "AUTH_MISSING_CREDENTIALS" } });
      throw new HttpException({ error: "AUTH_MISSING_CREDENTIALS", message: "email and password are required" }, HttpStatus.BAD_REQUEST);
    }
    
    const identity = identityStore.findByEmail(body.email);
    if (!identity) {
      incrementMetric("auth_login_failure_total");
      authLogger.warn("auth.login.failure", { requestId, meta: { reason: "AUTH_INVALID_CREDENTIALS" } });
      throw new HttpException({ error: "AUTH_INVALID_CREDENTIALS", message: "invalid email or password" }, authErrorStatus("AUTH_INVALID_CREDENTIALS"));
    }
    
    const statusErr = accountStatusError(identity.status);
    if (statusErr) {
      incrementMetric("auth_login_failure_total");
      throw new HttpException(statusErr, authErrorStatus(statusErr.error));
    }
    
    const passwordMatch = await bcrypt.compare(body.password, identity.passwordHash);
    if (!passwordMatch) {
      incrementMetric("auth_login_failure_total");
      authLogger.warn("auth.login.failure", { requestId, meta: { reason: "AUTH_INVALID_CREDENTIALS" } });
      throw new HttpException({ error: "AUTH_INVALID_CREDENTIALS", message: "invalid email or password" }, authErrorStatus("AUTH_INVALID_CREDENTIALS"));
    }
    
    const accessToken = accessTokenSigner.sign({ sub: identity.userId, clinicId: identity.clinicId, role: identity.role });
    const refreshToken = randomUUID();
    sessionStore.save(makeSession({ sessionId: accessToken, userId: identity.userId, clinicId: identity.clinicId, accessToken, refreshToken }));
    seenRefreshTokens.add(refreshToken);
    incrementMetric("auth_login_success_total");
    authLogger.info("auth.login.success", { requestId, userId: identity.userId, clinicId: identity.clinicId });
    const payload: LoginResponse = { session: { userId: identity.userId, clinicId: identity.clinicId, role: identity.role, accessToken } };
    return res.json(payload);
  }

  @Post('logout')
  logout(@Ip() ip: string, @Res() res: Response) {
    if (limited(`recovery:${ip ?? "unknown"}`, 30)) {
      throw new HttpException({ error: "AUTH_RATE_LIMITED", message: "too many auth requests" }, HttpStatus.TOO_MANY_REQUESTS);
    }
    return res.json({ ok: true });
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@AuthContext() auth: AuthContextType, @Res() res: Response) {
    const identity = identityStore.findById(auth.userId);
    if (!identity) { 
      throw new HttpException({ error: "AUTH_TOKEN_INVALID", message: "user not found" }, HttpStatus.UNAUTHORIZED); 
    }
    const payload: MeResponse = {
      userId: identity.userId,
      clinicId: identity.clinicId,
      role: identity.role,
      email: identity.email,
    };
    return res.json(payload);
  }

  @Get('owner-only')
  @UseGuards(AuthGuard)
  ownerOnly(@AuthContext() auth: AuthContextType, @Res() res: Response) {
    if (auth.role !== "owner") {
      throw new HttpException({ error: "AUTH_FORBIDDEN", message: "owner role required" }, HttpStatus.FORBIDDEN);
    }
    return res.json({ ok: true, userId: auth.userId, clinicId: auth.clinicId });
  }

  @Post('refresh')
  refresh(@Body() body: any, @Headers('x-request-id') reqId: string, @Ip() ip: string, @Res() res: Response) {
    const requestId = reqId ?? randomUUID();
    if (limited(`refresh:${ip ?? "unknown"}`, 20)) {
      incrementMetric("auth_refresh_failure_total");
      throw new HttpException({ error: "AUTH_RATE_LIMITED", message: "too many refresh attempts" }, HttpStatus.TOO_MANY_REQUESTS);
    }
    const refreshToken = body?.refreshToken;
    if (!refreshToken) {
      incrementMetric("auth_refresh_failure_total");
      throw new HttpException({ error: "AUTH_TOKEN_INVALID", message: "refreshToken is required" }, authErrorStatus("AUTH_TOKEN_INVALID"));
    }
    const existing = sessionStore.findByRefreshToken(refreshToken);
    if (!existing) {
      if (seenRefreshTokens.has(refreshToken)) {
        authLogger.warn("auth.token.expired", { meta: { reason: "refresh_reuse_detected" } });
        authLogger.warn("auth.login.failure", { meta: { reason: "suspicious_reuse" } });
      }
      incrementMetric("auth_refresh_failure_total");
      throw new HttpException({ error: "AUTH_TOKEN_INVALID", message: "invalid refresh token" }, authErrorStatus("AUTH_TOKEN_INVALID"));
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
    return res.json({ ok: true, accessToken: nextAccess, refreshToken: nextRefresh });
  }

  @Post('password-reset/request')
  passwordResetRequest(@Body() body: any, @Ip() ip: string, @Res() res: Response) {
    if (limited(`recovery:${ip ?? "unknown"}`, 10)) {
      throw new HttpException({ error: "AUTH_RATE_LIMITED", message: "too many recovery requests" }, HttpStatus.TOO_MANY_REQUESTS);
    }
    const email = body?.email;
    if (!email) {
      throw new HttpException({ error: "AUTH_MISSING_CREDENTIALS", message: "email is required" }, HttpStatus.BAD_REQUEST);
    }
    const token = randomUUID();
    const identity = identityStore.findByEmail(email);
    if (identity) {
      resetTokens.set(token, { userId: identity.userId, expiresAt: Date.now() + 15 * 60_000 });
    }
    authLogger.info("auth.recovery.requested", { meta: { tokenPreview: token.slice(0, 8) } });
    return res.json({ ok: true });
  }

  @Post('password-reset/confirm')
  passwordResetConfirm(@Body() body: any, @Res() res: Response) {
    const { token, password } = body;
    if (!token || !password) {
      throw new HttpException({ error: "AUTH_MISSING_CREDENTIALS", message: "token and password are required" }, HttpStatus.BAD_REQUEST);
    }
    const pwdErr = validatePassword(password);
    if (pwdErr) {
      throw new HttpException({ error: "AUTH_MISSING_CREDENTIALS", message: pwdErr }, HttpStatus.BAD_REQUEST);
    }
    const reset = resetTokens.get(token);
    if (!reset || Date.now() > reset.expiresAt) {
      resetTokens.delete(token);
      throw new HttpException({ error: "AUTH_TOKEN_INVALID", message: "invalid or expired reset token" }, HttpStatus.UNAUTHORIZED);
    }
    resetTokens.delete(token);
    authLogger.info("auth.recovery.completed", { userId: reset.userId });
    return res.json({ ok: true });
  }

  @Post('verify/request')
  verifyRequest(@Body() body: any, @Res() res: Response) {
    const email = body?.email;
    if (!email) {
      throw new HttpException({ error: "AUTH_MISSING_CREDENTIALS", message: "email is required" }, HttpStatus.BAD_REQUEST);
    }
    const token = randomUUID();
    const identity = identityStore.findByEmail(email);
    if (identity) {
      verifyTokens.set(token, { userId: identity.userId, email, expiresAt: Date.now() + 24 * 60 * 60_000 });
    }
    return res.json({ ok: true });
  }

  @Post('verify/confirm')
  verifyComplete(@Body() body: any, @Res() res: Response) {
    const token = body?.token;
    if (!token) {
      throw new HttpException({ error: "AUTH_MISSING_CREDENTIALS", message: "token is required" }, HttpStatus.BAD_REQUEST);
    }
    const verify = verifyTokens.get(token);
    if (!verify || Date.now() > verify.expiresAt) {
      verifyTokens.delete(token);
      throw new HttpException({ error: "AUTH_TOKEN_INVALID", message: "invalid or expired verification token" }, HttpStatus.UNAUTHORIZED);
    }
    verifyTokens.delete(token);
    return res.json({ ok: true, email: verify.email, userId: verify.userId });
  }

  @Get('metrics')
  metrics(@Res() res: Response) {
    return res.json({ ok: true, metrics: getAuthMetricsSnapshot() });
  }
}
