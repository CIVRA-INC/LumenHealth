import { Injectable } from '@nestjs/common';
import { ERROR_CODES, type OrgUserView } from '@lumen/contracts';
import { ConflictError, DomainError, NotFoundError } from '../../common/errors';
import type { RequestContext } from '../../common/request-context';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { toOrgUserView } from './org-user.view';
import { SessionService } from './session.service';

const membershipInclude = { user: true, branches: { include: { branch: true } } } as const;

/**
 * Staff offboarding within the signed-in organisation (#1457).
 *
 * Status lives on the membership (per organisation) and on the user (identity). When a person
 * has no other active membership we also suspend the identity, so every session is rejected.
 */
@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
    private readonly audit: AuditService,
  ) {}

  private load(ctx: RequestContext, staffId: string) {
    return this.prisma.membership.findUnique({
      where: { id_organizationId: { id: staffId, organizationId: ctx.organizationId } },
      include: membershipInclude,
    });
  }

  async deactivate(ctx: RequestContext, staffId: string): Promise<OrgUserView> {
    const current = await this.load(ctx, staffId);
    if (!current) throw new NotFoundError('Staff member');

    if (current.userId === ctx.userId) {
      await this.audit.recordStandalone(ctx, {
        action: 'staff.deactivated',
        resourceType: 'membership',
        resourceId: staffId,
        outcome: 'DENIED',
        metadata: { reason: 'self' },
      });
      throw new DomainError(
        403,
        ERROR_CODES.staffCannotDeactivateSelf,
        'You cannot deactivate yourself',
      );
    }

    if (current.role === 'ORG_ADMIN' && current.status === 'ACTIVE') {
      const otherAdmins = await this.prisma.membership.count({
        where: {
          organizationId: ctx.organizationId,
          role: 'ORG_ADMIN',
          status: 'ACTIVE',
          id: { not: staffId },
        },
      });
      if (otherAdmins === 0) {
        await this.audit.recordStandalone(ctx, {
          action: 'staff.deactivated',
          resourceType: 'membership',
          resourceId: staffId,
          outcome: 'DENIED',
          metadata: { reason: 'last_owner' },
        });
        throw new ConflictError(
          'The organisation must keep at least one active administrator',
          ERROR_CODES.staffLastOwner,
        );
      }
    }

    if (current.status === 'DISABLED') return toOrgUserView(current);

    const { updated, identityDisabled } = await this.prisma.$transaction(async (tx) => {
      const membership = await tx.membership.update({
        where: { id: staffId },
        data: { status: 'DISABLED' },
        include: membershipInclude,
      });
      const otherActive = await tx.membership.count({
        where: {
          userId: current.userId,
          status: 'ACTIVE',
          id: { not: staffId },
        },
      });
      if (otherActive === 0) {
        await tx.user.update({
          where: { id: current.userId },
          data: { status: 'DISABLED' },
        });
      }
      return { updated: membership, identityDisabled: otherActive === 0 };
    });

    // Sessions are revoked rather than deleted so the audit trail stays complete. AuthGuard
    // (through SessionService.resolve) then rejects any token issued before offboarding.
    await this.sessions.revokeAllForMembership(staffId);
    if (identityDisabled) await this.sessions.revokeAllForUser(current.userId);

    await this.audit.recordStandalone(ctx, {
      action: 'staff.deactivated',
      resourceType: 'membership',
      resourceId: staffId,
      metadata: { userId: current.userId, role: current.role, identityDisabled },
    });
    return toOrgUserView(updated);
  }

  async reactivate(ctx: RequestContext, staffId: string): Promise<OrgUserView> {
    const current = await this.load(ctx, staffId);
    if (!current) throw new NotFoundError('Staff member');
    if (current.status === 'ACTIVE') return toOrgUserView(current);

    const updated = await this.prisma.$transaction(async (tx) => {
      const membership = await tx.membership.update({
        where: { id: staffId },
        data: { status: 'ACTIVE' },
        include: membershipInclude,
      });
      await tx.user.update({ where: { id: current.userId }, data: { status: 'ACTIVE' } });
      return membership;
    });

    // Revoked sessions are deliberately not restored: the person signs in again to get a fresh one.
    await this.audit.recordStandalone(ctx, {
      action: 'staff.reactivated',
      resourceType: 'membership',
      resourceId: staffId,
      metadata: { userId: current.userId, role: current.role },
    });
    return toOrgUserView(updated);
  }
}
