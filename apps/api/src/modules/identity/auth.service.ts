import { Inject, Injectable } from '@nestjs/common';
import {
  ERROR_CODES,
  permissionsForRole,
  type ChangePasswordInput,
  type LoginInput,
  type SessionView,
  type SwitchContextInput,
} from '@lumen/contracts';
import {
  DomainError,
  ForbiddenError,
  NotFoundError,
  UnauthenticatedError,
  ValidationError,
} from '../../common/errors';
import type { RequestContext } from '../../common/request-context';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const GENERIC_FAILURE = 'Incorrect email or password';

interface ClientInfo {
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly audit: AuditService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async login(
    input: LoginInput,
    client: ClientInfo,
  ): Promise<{ token: string; expiresAt: Date; view: SessionView }> {
    const email = input.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      await this.passwords.verifyDecoy(input.password);
      await this.audit.recordUnscoped({
        action: 'auth.login',
        resourceType: 'user',
        outcome: 'FAILURE',
        ...client,
      });
      throw new UnauthenticatedError(GENERIC_FAILURE);
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.audit.recordUnscoped({
        action: 'auth.login',
        resourceType: 'user',
        resourceId: user.id,
        actorUserId: user.id,
        outcome: 'DENIED',
        metadata: { reason: 'locked' },
        ...client,
      });
      throw new DomainError(
        429,
        ERROR_CODES.accountLocked,
        'Too many failed attempts. Try again in a few minutes or contact your administrator.',
      );
    }

    const valid = await this.passwords.verify(user.passwordHash, input.password);
    if (!valid || user.status !== 'ACTIVE') {
      if (!valid) {
        const attempts = user.failedLoginAttempts + 1;
        const lock = attempts >= MAX_FAILED_ATTEMPTS;
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: lock ? 0 : attempts,
            lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
          },
        });
      }
      await this.audit.recordUnscoped({
        action: 'auth.login',
        resourceType: 'user',
        resourceId: user.id,
        actorUserId: user.id,
        outcome: 'FAILURE',
        metadata: { reason: valid ? 'disabled' : 'bad_credentials' },
        ...client,
      });
      throw new UnauthenticatedError(GENERIC_FAILURE);
    }

    const membership = await this.prisma.membership.findFirst({
      where: { userId: user.id, status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
      include: { branches: { include: { branch: true } } },
    });
    const branch = membership?.branches.find((b) => b.branch.active)?.branch;
    if (!membership || !branch) {
      await this.audit.recordUnscoped({
        action: 'auth.login',
        resourceType: 'user',
        resourceId: user.id,
        actorUserId: user.id,
        outcome: 'DENIED',
        metadata: { reason: 'no_active_access' },
        ...client,
      });
      throw new ForbiddenError('Your account has no active organisation or branch access');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
    const session = await this.sessions.create({
      userId: user.id,
      membershipId: membership.id,
      branchId: branch.id,
      ip: client.ip,
      userAgent: client.userAgent,
    });
    await this.audit.recordStandalone(
      { userId: user.id, organizationId: membership.organizationId, ...client },
      { action: 'auth.login', resourceType: 'session', resourceId: membership.id },
    );
    const ctx = (await this.sessions.resolve(session.token))!;
    return { ...session, view: await this.view(ctx) };
  }

  async logout(ctx: RequestContext): Promise<void> {
    await this.sessions.revoke(ctx.sessionId);
    await this.audit.recordStandalone(ctx, {
      action: 'auth.logout',
      resourceType: 'session',
      resourceId: ctx.sessionId,
    });
  }

  async view(ctx: RequestContext): Promise<SessionView> {
    const [user, membership, allMemberships] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: ctx.userId } }),
      this.prisma.membership.findUniqueOrThrow({
        where: { id: ctx.membershipId },
        include: { organization: true, branches: { include: { branch: true } } },
      }),
      this.prisma.membership.findMany({
        where: { userId: ctx.userId, status: 'ACTIVE' },
        include: { organization: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    const branches = membership.branches
      .filter((b) => b.branch.active)
      .map((b) => ({ id: b.branch.id, name: b.branch.name, code: b.branch.code }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const active = branches.find((b) => b.id === ctx.branchId);
    if (!active) throw new NotFoundError('Branch');
    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        mustChangePassword: user.mustChangePassword,
      },
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        timezone: membership.organization.timezone,
      },
      role: membership.role,
      permissions: [...permissionsForRole(membership.role)],
      branch: active,
      branches,
      memberships: allMemberships.map((m) => ({
        organizationId: m.organizationId,
        organizationName: m.organization.name,
        role: m.role,
      })),
    };
  }

  /** Changes the active organisation and/or branch of the current session. */
  async switchContext(ctx: RequestContext, input: SwitchContextInput): Promise<SessionView> {
    let membershipId = ctx.membershipId;
    let branchId = input.branchId ?? ctx.branchId;

    if (input.organizationId && input.organizationId !== ctx.organizationId) {
      const target = await this.prisma.membership.findFirst({
        where: { userId: ctx.userId, organizationId: input.organizationId, status: 'ACTIVE' },
        include: { branches: { include: { branch: true } } },
      });
      if (!target) throw new ForbiddenError('You do not belong to that organisation');
      const allowed = target.branches.filter((b) => b.branch.active);
      const chosen = input.branchId
        ? allowed.find((b) => b.branchId === input.branchId)
        : allowed[0];
      if (!chosen) throw new ForbiddenError('You have no access to that branch');
      membershipId = target.id;
      branchId = chosen.branchId;
    } else if (!ctx.accessibleBranchIds.includes(branchId)) {
      throw new ForbiddenError('You have no access to that branch');
    }

    await this.prisma.session.update({
      where: { id: ctx.sessionId },
      data: { membershipId, branchId },
    });
    const next = { ...ctx, membershipId, branchId };
    if (membershipId !== ctx.membershipId) {
      const refreshed = await this.prisma.membership.findUniqueOrThrow({
        where: { id: membershipId },
        include: { organization: true, branches: true },
      });
      next.organizationId = refreshed.organizationId;
      next.timezone = refreshed.organization.timezone;
      next.role = refreshed.role;
      next.permissions = permissionsForRole(refreshed.role);
      next.accessibleBranchIds = refreshed.branches.map((b) => b.branchId);
    }
    await this.audit.recordStandalone(next, {
      action: 'auth.switch_context',
      resourceType: 'session',
      resourceId: ctx.sessionId,
      metadata: { branchId },
    });
    return this.view(next);
  }

  async changePassword(ctx: RequestContext, input: ChangePasswordInput): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: ctx.userId } });
    if (!(await this.passwords.verify(user.passwordHash, input.currentPassword))) {
      await this.audit.recordStandalone(ctx, {
        action: 'auth.change_password',
        resourceType: 'user',
        resourceId: ctx.userId,
        outcome: 'FAILURE',
      });
      throw new ValidationError('Your current password is incorrect', {
        fields: [{ path: 'currentPassword', message: 'Incorrect password' }],
      });
    }
    if (input.currentPassword === input.newPassword) {
      throw new ValidationError('Choose a password you have not used just now', {
        fields: [{ path: 'newPassword', message: 'Must differ from the current password' }],
      });
    }
    await this.prisma.user.update({
      where: { id: ctx.userId },
      data: {
        passwordHash: await this.passwords.hash(input.newPassword),
        mustChangePassword: false,
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
    // Every other device is signed out after a password change.
    await this.sessions.revokeAllForUser(ctx.userId, ctx.sessionId);
    await this.audit.recordStandalone(ctx, {
      action: 'auth.change_password',
      resourceType: 'user',
      resourceId: ctx.userId,
    });
  }
}
