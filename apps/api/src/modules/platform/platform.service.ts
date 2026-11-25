import { Injectable } from '@nestjs/common';
import {
  toPage,
  type OrganizationDetail,
  type OrganizationStatus,
  type OrganizationSummary,
  type Page,
  type RegisterOrganizationInput,
} from '@lumen/contracts';
import { ConflictError, NotFoundError } from '../../common/errors';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService, type PlatformActor } from '../audit/audit.service';
import { InvitationsService } from '../invitations/invitations.service';
import { SessionService } from '../identity/session.service';

const slugify = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'hospital';

@Injectable()
export class PlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly invitations: InvitationsService,
    private readonly sessions: SessionService,
  ) {}

  private async summarise(
    orgs: Prisma.OrganizationGetPayload<object>[],
  ): Promise<OrganizationSummary[]> {
    const ids = orgs.map((o) => o.id);
    const [branches, staff, admins] = await Promise.all([
      this.prisma.branch.groupBy({
        by: ['organizationId'],
        where: { organizationId: { in: ids } },
        _count: true,
      }),
      this.prisma.membership.groupBy({
        by: ['organizationId'],
        where: { organizationId: { in: ids }, status: 'ACTIVE' },
        _count: true,
      }),
      this.prisma.membership.groupBy({
        by: ['organizationId'],
        where: { organizationId: { in: ids }, status: 'ACTIVE', role: 'ORG_ADMIN' },
        _count: true,
      }),
    ]);
    const count = (rows: { organizationId: string; _count: number }[], id: string) =>
      rows.find((r) => r.organizationId === id)?._count ?? 0;
    return orgs.map((o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      timezone: o.timezone,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
      branchCount: count(branches, o.id),
      activeStaffCount: count(staff, o.id),
      onboarding: count(admins, o.id) > 0 ? 'ACTIVE' : 'AWAITING_ADMIN',
    }));
  }

  async list(q: {
    q?: string;
    status?: OrganizationStatus;
    page: number;
    pageSize: number;
  }): Promise<Page<OrganizationSummary>> {
    const where: Prisma.OrganizationWhereInput = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.q?.trim() ? { name: { contains: q.q.trim(), mode: 'insensitive' } } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.organization.count({ where }),
    ]);
    return toPage(await this.summarise(rows), total, q.page, q.pageSize);
  }

  async detail(id: string): Promise<OrganizationDetail> {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        branches: { orderBy: { name: 'asc' } },
        memberships: {
          where: { role: 'ORG_ADMIN' },
          include: { user: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!org) throw new NotFoundError('Organisation');
    const [summary] = await this.summarise([org]);
    const invitations = await this.invitations.list(
      { organizationId: id },
      { page: 1, pageSize: 50 },
    );
    return {
      ...summary!,
      branches: org.branches.map((b) => ({
        id: b.id,
        name: b.name,
        code: b.code,
        active: b.active,
      })),
      administrators: org.memberships.map((m) => ({
        userId: m.userId,
        fullName: m.user.fullName,
        email: m.user.email,
        status: m.status,
      })),
      invitations: invitations.items,
    };
  }

  /**
   * Registers a hospital: organisation, first branch and the first administrator's invitation are created
   * in ONE transaction, so a failure never leaves a hospital without a way in or an orphan invitation.
   * The email is sent only after the commit; if it fails the hospital still exists and the invitation can be resent.
   */
  async register(actor: PlatformActor & { userId: string }, input: RegisterOrganizationInput) {
    const dupe = await this.prisma.organization.findFirst({
      where: { name: { equals: input.name, mode: 'insensitive' } },
    });
    if (dupe) throw new ConflictError('A hospital with that name is already registered');

    let slug = slugify(input.name);
    if (await this.prisma.organization.findUnique({ where: { slug } }))
      slug = `${slug.slice(0, 40)}-${Math.random().toString(36).slice(2, 8)}`;

    let created: { orgId: string; invitationId: string; token: string };
    try {
      created = await this.prisma.$transaction(
        async (tx) => {
          const org = await tx.organization.create({
            data: { name: input.name, slug, timezone: input.timezone },
          });
          // From here on the transaction speaks for this one organisation (row-level security).
          await tx.$executeRaw`SELECT set_config('app.current_org_id', ${org.id}, true)`;
          const branch = await tx.branch.create({
            data: { organizationId: org.id, name: input.branch.name, code: input.branch.code },
          });
          await this.audit.recordPlatform(
            actor,
            { action: 'organization.create', resourceType: 'organization', resourceId: org.id },
            org.id,
            tx,
          );
          const inv = await this.invitations.createInTx(tx, actor, {
            organizationId: org.id,
            email: input.admin.email,
            fullName: input.admin.fullName,
            role: 'ORG_ADMIN',
            branchIds: [branch.id],
            invitedByUserId: actor.userId,
          });
          return { orgId: org.id, invitationId: inv.id, token: inv.token };
        },
        { timeout: 15_000, maxWait: 10_000 },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new ConflictError('A hospital with that name or identifier already exists');
      throw error;
    }
    await this.invitations.deliver(created.invitationId, created.token);
    return this.detail(created.orgId);
  }

  async setStatus(
    actor: PlatformActor,
    id: string,
    status: OrganizationStatus,
  ): Promise<OrganizationDetail> {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundError('Organisation');
    if (org.status === status) return this.detail(id);
    await this.prisma.tenant(id, async (tx) => {
      await tx.organization.update({
        where: { id },
        data: { status, suspendedAt: status === 'SUSPENDED' ? new Date() : null },
      });
      await this.audit.recordPlatform(
        actor,
        {
          action: status === 'SUSPENDED' ? 'organization.suspend' : 'organization.reactivate',
          resourceType: 'organization',
          resourceId: id,
        },
        id,
        tx,
      );
    });
    // Suspension takes effect immediately: every staff session in the hospital ends now.
    if (status === 'SUSPENDED') await this.sessions.revokeAllForOrganization(id);
    return this.detail(id);
  }
}
