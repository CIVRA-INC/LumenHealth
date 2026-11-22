import { Controller, Post, Get, Delete, Body, Res, HttpException, HttpStatus, UseGuards, Headers, Ip } from '@nestjs/common';
import type { Response } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import type { LoginRequest, LoginResponse, MeResponse, PasswordResetConfirmBody, PasswordResetRequestBody, RefreshRequest, VerifyConfirmBody, VerifyRequestBody } from '@lumen/types';

import { authConfig } from '@lumen/config';
import { hashAuditEntry } from '@lumen/types';

import { identityStore } from '../repositories/identity.repository.js';
import { checkClinicAccess } from '../services/clinic-access.service.js';
import { makeSession, sessionStore } from '../repositories/session.repository.js';
import { clinicStore } from '../../clinic/repositories/clinic.repository.js';
import { staffStore } from '../../staff/repositories/staff.repository.js';
import { auditStore } from '../../audit/repositories/audit.repository.js';
import { oneTimeTokens } from '../repositories/one-time-token.repository.js';
import { accessTokenSigner } from '../services/token.service.js';
import { accountStatusError } from '../services/account-status.service.js';
import { incrementMetric, getAuthMetricsSnapshot } from '../services/metrics.service.js';
import { authErrorStatus } from '../../../shared/errors/index.js';
import { authLogger } from '../../../shared/logger/index.js';
import { validatePassword, BREACHED_PASSWORD_MESSAGE, checkPasswordBreached } from '../validators/password.validator.js';
import { performDummyPasswordCompare } from '../services/login-timing.js';
import { limited, _resetRateLimiter } from '../rate-limit/rate-limiter.js';
import { AuthGuard } from '../guards/auth.guard.js';
import { AuthContext } from '../../../shared/decorators/auth-context.decorator.js';
import type { AuthContextType } from '../../../shared/types/auth-context.js';

const seenRefreshTokens = new Set<string>();

export function _resetAuthStateForTests() {
  seenRefreshTokens.clear();
  oneTimeTokens._reset();
  _resetRateLimiter();
}

/** Audit/log reason for a login refused because of the account state. */
function loginBlockReason(status: string): string {
  switch (status) {
    case "locked":
      return "ACCOUNT_LOCKED";
    case "suspended":
      return "ACCOUNT_SUSPENDED";
    default:
      return "ACCOUNT_PENDING";
  }
}

@Controller('auth')
export class AuthController {
  
  @Post('login')
  async login(
    @Body() body: Partial<LoginRequest>,
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
      // Timing equalization: an unknown email must cost the same wall-clock
      // time as a wrong password (docs/auth-threat-model.md T7).
      await performDummyPasswordCompare(body.password);
      incrementMetric("auth_login_failure_total");
      authLogger.warn("auth.login.failure", { requestId, meta: { reason: "AUTH_INVALID_CREDENTIALS" } });
      throw new HttpException({ error: "AUTH_INVALID_CREDENTIALS", message: "invalid email or password" }, authErrorStatus("AUTH_INVALID_CREDENTIALS"));
    }
    
    // A locked, pending or suspended account answers exactly like an unknown
    // email or a wrong password (same 401 body, same timing), so the response
    // cannot be used to enumerate accounts or learn their state. The specific
    // reason is recorded only in the log (docs/auth-lockout-policy.md).
    const statusErr = accountStatusError(identity.status);
    if (statusErr) {
      await performDummyPasswordCompare(body.password);
      incrementMetric("auth_login_failure_total");
      authLogger.warn("auth.login.failure", {
        requestId,
        userId: identity.userId,
        clinicId: identity.clinicId,
        meta: { reason: loginBlockReason(identity.status) },
      });
      throw new HttpException({ error: "AUTH_INVALID_CREDENTIALS", message: "invalid email or password" }, authErrorStatus("AUTH_INVALID_CREDENTIALS"));
    }

    const clinicAccess = checkClinicAccess(identity.clinicId);
    if (clinicAccess) {
      await performDummyPasswordCompare(body.password);
      incrementMetric("auth_login_failure_total");
      authLogger.warn("auth.login.failure", { requestId, userId: identity.userId, clinicId: identity.clinicId, meta: { reason: clinicAccess.body.message } });
      throw new HttpException(clinicAccess.body, clinicAccess.status);
    }
    
    const passwordMatch = await bcrypt.compare(body.password, identity.passwordHash);
    if (!passwordMatch) {
      incrementMetric("auth_login_failure_total");
      authLogger.warn("auth.login.failure", { requestId, meta: { reason: "AUTH_INVALID_CREDENTIALS" } });
      throw new HttpException({ error: "AUTH_INVALID_CREDENTIALS", message: "invalid email or password" }, authErrorStatus("AUTH_INVALID_CREDENTIALS"));
    }
    
    const accessToken = accessTokenSigner.sign({ sub: identity.userId, clinicId: identity.clinicId, role: identity.role });
    const refreshToken = randomUUID();
    sessionStore.save(makeSession(
      { sessionId: accessToken, userId: identity.userId, clinicId: identity.clinicId, accessToken, refreshToken },
      { accessTtlSeconds: authConfig.accessTokenTtl, refreshTtlSeconds: authConfig.refreshTokenTtl },
    ));
    incrementMetric("auth_login_success_total");
    authLogger.info("auth.login.success", { requestId, userId: identity.userId, clinicId: identity.clinicId });
    const payload: LoginResponse = { session: { userId: identity.userId, clinicId: identity.clinicId, role: identity.role, accessToken, refreshToken } };
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
  refresh(@Body() body: Partial<RefreshRequest>, @Headers('x-request-id') reqId: string, @Ip() ip: string, @Res() res: Response) {
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
      const reusedFamily = sessionStore.wasRotated(refreshToken);
      if (reusedFamily) {
        sessionStore.revokeFamily(reusedFamily);
        authLogger.warn("auth.token.expired", { meta: { reason: "refresh_reuse_detected", familyId: reusedFamily } });
        authLogger.warn("auth.login.failure", { meta: { reason: "suspicious_reuse" } });
      }
      incrementMetric("auth_refresh_failure_total");
      throw new HttpException({ error: "AUTH_TOKEN_INVALID", message: "invalid refresh token" }, authErrorStatus("AUTH_TOKEN_INVALID"));
    }
    if (Math.floor(Date.now() / 1000) >= existing.refreshExpiresAt) {
      sessionStore.delete(existing.sessionId);
      incrementMetric("auth_refresh_failure_total");
      authLogger.warn("auth.token.expired", { requestId, userId: existing.userId, clinicId: existing.clinicId, meta: { reason: "refresh_expired" } });
      throw new HttpException({ error: "AUTH_TOKEN_EXPIRED", message: "refresh token expired" }, authErrorStatus("AUTH_TOKEN_EXPIRED"));
    }
    sessionStore.revokeByRefreshToken(refreshToken);
    const identity = identityStore.findById(existing.userId);
    if (!identity || accountStatusError(identity.status)) {
      incrementMetric("auth_refresh_failure_total");
      throw new HttpException({ error: "AUTH_TOKEN_INVALID", message: "invalid refresh token" }, authErrorStatus("AUTH_TOKEN_INVALID"));
    }
    const clinicAccess = checkClinicAccess(identity.clinicId);
    if (clinicAccess) {
      incrementMetric("auth_refresh_failure_total");
      throw new HttpException(clinicAccess.body, clinicAccess.status);
    }
    const role = identity.role;
    const nextAccess = accessTokenSigner.sign({ sub: existing.userId, clinicId: existing.clinicId, role });
    const nextRefresh = randomUUID();
    sessionStore.save(makeSession(
      { sessionId: nextAccess, userId: existing.userId, clinicId: existing.clinicId, accessToken: nextAccess, refreshToken: nextRefresh, familyId: existing.familyId },
      { accessTtlSeconds: authConfig.accessTokenTtl, refreshTtlSeconds: authConfig.refreshTokenTtl },
    ));
    incrementMetric("auth_refresh_success_total");
    authLogger.info("auth.token.refreshed", { requestId, userId: existing.userId, clinicId: existing.clinicId });
    return res.json({ ok: true, accessToken: nextAccess, refreshToken: nextRefresh });
  }

  @Post('password-reset/request')
  passwordResetRequest(@Body() body: Partial<PasswordResetRequestBody>, @Ip() ip: string, @Res() res: Response) {
    if (limited(`recovery:${ip ?? "unknown"}`, 10)) {
      throw new HttpException({ error: "AUTH_RATE_LIMITED", message: "too many recovery requests" }, HttpStatus.TOO_MANY_REQUESTS);
    }
    const email = body?.email;
    if (!email) {
      throw new HttpException({ error: "AUTH_MISSING_CREDENTIALS", message: "email is required" }, HttpStatus.BAD_REQUEST);
    }
    const identity = identityStore.findByEmail(email);
    const token = identity ? oneTimeTokens.issue(identity.userId, 'password_reset', 15 * 60_000) : randomUUID();
    authLogger.info("auth.recovery.requested", { meta: { tokenPreview: token.slice(0, 8) } });
    return res.json({ ok: true });
  }

  @Post('password-reset/confirm')
  async passwordResetConfirm(@Body() body: Partial<PasswordResetConfirmBody>, @Res() res: Response) {
    const { token, password } = body;
    if (!token || !password) {
      throw new HttpException({ error: "AUTH_MISSING_CREDENTIALS", message: "token and password are required" }, HttpStatus.BAD_REQUEST);
    }
    const pwdErr = validatePassword(password);
    if (pwdErr) {
      throw new HttpException({ error: "AUTH_MISSING_CREDENTIALS", message: pwdErr }, HttpStatus.BAD_REQUEST);
    }
    const reset = oneTimeTokens.find(token, 'password_reset');
    if (!reset) {
      throw new HttpException({ error: "AUTH_TOKEN_INVALID", message: "invalid or expired reset token" }, HttpStatus.UNAUTHORIZED);
    }
    // Known-breached passwords are rejected here. Deliberately *after* the
    // token check: unauthenticated callers must not be able to make the API
    // call out to the breach range API (docs/auth-threat-model.md T8).
    const breach = await checkPasswordBreached(password);
    if (breach.breached) {
      throw new HttpException({ error: "AUTH_MISSING_CREDENTIALS", message: BREACHED_PASSWORD_MESSAGE }, HttpStatus.BAD_REQUEST);
    }
    oneTimeTokens.consume(token, 'password_reset');
    authLogger.info("auth.recovery.completed", { userId: reset.userId });
    return res.json({ ok: true });
  }

  @Post('verify/request')
  verifyRequest(@Body() body: Partial<VerifyRequestBody>, @Res() res: Response) {
    const email = body?.email;
    if (!email) {
      throw new HttpException({ error: "AUTH_MISSING_CREDENTIALS", message: "email is required" }, HttpStatus.BAD_REQUEST);
    }
    const identity = identityStore.findByEmail(email);
    if (identity) {
      oneTimeTokens.issue(identity.userId, 'email_verify', 24 * 60 * 60_000, { email });
    }
    return res.json({ ok: true });
  }

  @Post('verify/confirm')
  verifyComplete(@Body() body: Partial<VerifyConfirmBody>, @Res() res: Response) {
    const token = body?.token;
    if (!token) {
      throw new HttpException({ error: "AUTH_MISSING_CREDENTIALS", message: "token is required" }, HttpStatus.BAD_REQUEST);
    }
    const verify = oneTimeTokens.consume(token, 'email_verify');
    if (!verify) {
      throw new HttpException({ error: "AUTH_TOKEN_INVALID", message: "invalid or expired verification token" }, HttpStatus.UNAUTHORIZED);
    }
    return res.json({ ok: true, email: verify.meta?.email, userId: verify.userId });
  }

  @Delete('me')
  @UseGuards(AuthGuard)
  async deleteMe(@AuthContext() auth: AuthContextType, @Body() body: { password?: string }, @Res() res: Response) {
    const password = body?.password;
    if (!password) {
      throw new HttpException({ error: "AUTH_MISSING_CREDENTIALS", message: "password is required" }, HttpStatus.BAD_REQUEST);
    }

    const identity = identityStore.findById(auth.userId);
    if (!identity) {
      throw new HttpException({ error: "AUTH_TOKEN_INVALID", message: "user not found" }, HttpStatus.UNAUTHORIZED);
    }

    const passwordMatch = await bcrypt.compare(password, identity.passwordHash);
    if (!passwordMatch) {
      throw new HttpException({ error: "AUTH_INVALID_CREDENTIALS", message: "invalid email or password" }, authErrorStatus("AUTH_INVALID_CREDENTIALS"));
    }

    const clinic = clinicStore.findById(identity.clinicId);
    if (clinic?.status === "active") {
      const staffMembers = staffStore.listByClinic(identity.clinicId);
      const activeOwners = staffMembers.filter((m) => m.role === "owner" && m.status === "active");
      const isCallerActiveOwner = activeOwners.some((m) => m.userId === identity.userId);
      if (isCallerActiveOwner && activeOwners.length === 1) {
        throw new HttpException({ error: "OWNER_REQUIRED", message: "clinic must retain at least one active owner" }, HttpStatus.CONFLICT);
      }
    }

    const staffMember = staffStore.findByUserId(identity.userId);
    if (staffMember) {
      try {
        staffStore.save({ ...staffMember, status: "deactivated", updatedAt: new Date().toISOString() });
      } catch {
        staffStore.delete(staffMember.staffId);
      }
    }

    sessionStore.revokeByUserId(identity.userId);
    identityStore.delete(identity.userId);

    const clinicEntries = auditStore.findAllInRange(identity.clinicId).filter((e) => e.sequence !== undefined).sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
    const last = clinicEntries[clinicEntries.length - 1];
    const unhashed = {
      auditId: randomUUID(),
      clinicId: identity.clinicId,
      action: "staff.deactivated" as const,
      actorId: identity.userId,
      actorRole: identity.role,
      targetId: identity.userId,
      targetType: "staff" as const,
      createdAt: new Date().toISOString(),
      sequence: (last?.sequence ?? 0) + 1,
      prevHash: last?.sha256Hash,
    };
    auditStore.save({ ...unhashed, sha256Hash: hashAuditEntry(unhashed) });

    return res.status(204).send();
  }

  @Get('metrics')
  metrics(@Res() res: Response) {
    return res.json({ ok: true, metrics: getAuthMetricsSnapshot() });
  }
}
