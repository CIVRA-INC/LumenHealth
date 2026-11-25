import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { permissionsForPlatformRole, permissionsForRole, type Role } from '@lumen/contracts';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import type { PlatformContext, RequestContext } from '../../common/request-context';
import { PrismaService } from '../../database/prisma.service';

const TOUCH_INTERVAL_MS = 60_000;

export type Principal =
  { kind: 'organization'; ctx: RequestContext } | { kind: 'platform'; platform: PlatformContext };

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** Creates a platform-operator session (no membership, no branch). */
  createPlatform(input: {
    userId: string;
    ip?: string;
    userAgent?: string;
  }): Promise<{ token: string; expiresAt: Date }> {
    return this.create({ ...input, membershipId: null, branchId: null });
  }

  /** Creates a session and returns the opaque token. Only its hash is stored. */
  async create(input: {
    userId: string;
    membershipId: string | null;
    branchId: string | null;
    ip?: string;
    userAgent?: string;
  }): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.config.SESSION_ABSOLUTE_TIMEOUT_HOURS * 3_600_000);
    await this.prisma.session.create({
      data: {
        tokenHash: hashToken(token),
        userId: input.userId,
        membershipId: input.membershipId,
        branchId: input.branchId,
        expiresAt,
        ipAddress: input.ip,
        userAgent: input.userAgent?.slice(0, 300),
      },
    });
    return { token, expiresAt };
  }

  /** Resolves an organisation-scoped session only; null for unknown, expired, revoked or platform sessions. */
  async resolve(token: string): Promise<RequestContext | null> {
    const principal = await this.resolvePrincipal(token);
    return principal?.kind === 'organization' ? principal.ctx : null;
  }

  /** Resolves a token to an organisation or platform principal, or null if it is no longer valid. */
  async resolvePrincipal(token: string): Promise<Principal | null> {
    const now = new Date();
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: {
        user: true,
        branch: true,
        membership: {
          include: { organization: true, branches: { include: { branch: true } } },
        },
      },
    });
    if (!session || session.revokedAt || session.expiresAt <= now) return null;
    const idleMs = this.config.SESSION_IDLE_TIMEOUT_MINUTES * 60_000;
    if (now.getTime() - session.lastSeenAt.getTime() > idleMs) return null;
    if (session.user.status !== 'ACTIVE') return null;

    if (!session.membership || !session.branch) {
      // A platform session is valid only while its user still holds a platform role.
      if (session.membershipId || session.branchId || !session.user.platformRole) return null;
      if (now.getTime() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
        await this.prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: now } });
      }
      return {
        kind: 'platform',
        platform: {
          userId: session.userId,
          sessionId: session.id,
          platformRole: session.user.platformRole,
          permissions: permissionsForPlatformRole(session.user.platformRole),
          mustChangePassword: session.user.mustChangePassword,
        },
      };
    }
    // A suspended organisation's sessions stop working immediately, whatever the membership says.
    if (
      session.membership.status !== 'ACTIVE' ||
      session.membership.organization.status !== 'ACTIVE'
    )
      return null;

    const accessible = session.membership.branches
      .filter((b) => b.branch.active)
      .map((b) => b.branchId);
    // A branch removed from the membership since sign-in must not remain usable.
    if (!session.branch.active || !accessible.includes(session.branch.id)) return null;

    if (now.getTime() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
      await this.prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: now } });
    }

    const role: Role = session.membership.role;
    return {
      kind: 'organization',
      ctx: {
        userId: session.userId,
        sessionId: session.id,
        membershipId: session.membership.id,
        organizationId: session.membership.organizationId,
        timezone: session.membership.organization.timezone,
        role,
        permissions: permissionsForRole(role),
        branchId: session.branch.id,
        accessibleBranchIds: accessible,
        mustChangePassword: session.user.mustChangePassword,
      },
    };
  }

  async revokeAllForOrganization(organizationId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { revokedAt: null, membership: { organizationId } },
      data: { revokedAt: new Date() },
    });
  }

  async revoke(sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string, exceptSessionId?: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
      },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForMembership(membershipId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { membershipId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
