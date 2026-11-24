import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  createUserSchema,
  staffListQuerySchema,
  toPage,
  updateMembershipSchema,
  type OrgUserView,
  type Page,
} from '@lumen/contracts';
import type { Prisma } from '../../generated/prisma/client';
import { Ctx, RequirePermissions } from '../../common/decorators';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../common/errors';
import type { RequestContext } from '../../common/request-context';
import { parse, ZodApiBody } from '../../common/zod';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';

type MembershipWithUser = Awaited<ReturnType<UsersAdminController['loadMembership']>>;

@ApiTags('Administration')
@Controller({ path: 'admin/users', version: '1' })
export class UsersAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly audit: AuditService,
  ) {}

  private view(m: NonNullable<MembershipWithUser>): OrgUserView {
    return {
      membershipId: m.id,
      userId: m.userId,
      email: m.user.email,
      fullName: m.user.fullName,
      role: m.role,
      status: m.status,
      branches: m.branches.map((b) => ({ id: b.branchId, name: b.branch.name })),
      lastLoginAt: m.user.lastLoginAt?.toISOString() ?? null,
    };
  }

  loadMembership(organizationId: string, id: string) {
    return this.prisma.membership.findFirst({
      where: { id, organizationId },
      include: { user: true, branches: { include: { branch: true } } },
    });
  }

  private async assertBranches(organizationId: string, branchIds: string[]) {
    const found = await this.prisma.branch.count({
      where: { organizationId, id: { in: branchIds } },
    });
    if (found !== new Set(branchIds).size)
      throw new ValidationError('One or more branches do not exist');
  }

  /** Staff of the signed-in organisation: searchable, filterable, sortable and paginated on the server. */
  @Get()
  @RequirePermissions('users.read')
  async list(@Ctx() ctx: RequestContext, @Query() rawQuery: unknown): Promise<Page<OrgUserView>> {
    const q = parse(staffListQuerySchema, rawQuery);
    const search = q.q?.trim();
    const where: Prisma.MembershipWhereInput = {
      organizationId: ctx.organizationId,
      ...(q.role ? { role: q.role } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(search
        ? {
            user: {
              OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };
    const dir = q.order ?? (q.sort === 'lastLogin' ? 'desc' : 'asc');
    const orderBy: Prisma.MembershipOrderByWithRelationInput[] = [
      ...{
        name: [{ user: { fullName: dir } }],
        role: [{ role: dir }, { user: { fullName: 'asc' as const } }],
        lastLogin: [{ user: { lastLoginAt: { sort: dir, nulls: 'last' as const } } }],
        status: [{ status: dir }, { user: { fullName: 'asc' as const } }],
      }[q.sort],
      { id: dir },
    ];
    const [rows, total] = await Promise.all([
      this.prisma.membership.findMany({
        where,
        include: { user: true, branches: { include: { branch: true } } },
        orderBy,
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.membership.count({ where }),
    ]);
    return toPage(
      rows.map((m) => this.view(m)),
      total,
      q.page,
      q.pageSize,
    );
  }

  @Post()
  @RequirePermissions('users.manage')
  @ZodApiBody(createUserSchema)
  async create(@Ctx() ctx: RequestContext, @Body() body: unknown): Promise<OrgUserView> {
    const input = parse(createUserSchema, body);
    await this.assertBranches(ctx.organizationId, input.branchIds);
    const email = input.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      const already = await this.prisma.membership.findUnique({
        where: {
          userId_organizationId: { userId: existing.id, organizationId: ctx.organizationId },
        },
      });
      if (already) throw new ConflictError('That person already belongs to this organisation');
    }

    const membership = await this.prisma.$transaction(async (tx) => {
      const user =
        existing ??
        (await tx.user.create({
          data: {
            email,
            fullName: input.fullName,
            passwordHash: await this.passwords.hash(input.temporaryPassword),
            mustChangePassword: true,
          },
        }));
      return tx.membership.create({
        data: {
          userId: user.id,
          organizationId: ctx.organizationId,
          role: input.role,
          branches: {
            create: [...new Set(input.branchIds)].map((branchId) => ({ branchId })),
          },
        },
        include: { user: true, branches: { include: { branch: true } } },
      });
    });
    await this.audit.recordStandalone(ctx, {
      action: 'user.create',
      resourceType: 'membership',
      resourceId: membership.id,
      metadata: { role: input.role, attachedExistingUser: !!existing },
    });
    return this.view(membership);
  }

  @Patch(':membershipId')
  @RequirePermissions('users.manage')
  @ZodApiBody(updateMembershipSchema)
  async update(
    @Ctx() ctx: RequestContext,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @Body() body: unknown,
  ): Promise<OrgUserView> {
    const input = parse(updateMembershipSchema, body);
    const current = await this.loadMembership(ctx.organizationId, membershipId);
    if (!current) throw new NotFoundError('User');

    const demotes = input.role !== undefined && input.role !== 'ORG_ADMIN';
    const disables = input.status === 'DISABLED';
    if (current.id === ctx.membershipId && (demotes || disables)) {
      throw new ForbiddenError('You cannot remove your own administrator access');
    }
    if (current.role === 'ORG_ADMIN' && current.status === 'ACTIVE' && (demotes || disables)) {
      const otherAdmins = await this.prisma.membership.count({
        where: {
          organizationId: ctx.organizationId,
          role: 'ORG_ADMIN',
          status: 'ACTIVE',
          id: { not: current.id },
        },
      });
      if (otherAdmins === 0)
        throw new ConflictError('The organisation must keep at least one active administrator');
    }
    if (input.branchIds) await this.assertBranches(ctx.organizationId, input.branchIds);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (input.branchIds) {
        await tx.membershipBranch.deleteMany({
          where: { membershipId, organizationId: ctx.organizationId },
        });
        await tx.membershipBranch.createMany({
          data: [...new Set(input.branchIds)].map((branchId) => ({
            membershipId,
            branchId,
            organizationId: ctx.organizationId,
          })),
        });
      }
      return tx.membership.update({
        where: { id: membershipId },
        data: { role: input.role, status: input.status },
        include: { user: true, branches: { include: { branch: true } } },
      });
    });
    // Permission or access changes take effect immediately, not at next sign-in.
    if (input.role !== undefined || input.status !== undefined || input.branchIds) {
      await this.sessions.revokeAllForMembership(membershipId);
    }
    await this.audit.recordStandalone(ctx, {
      action: 'user.update',
      resourceType: 'membership',
      resourceId: membershipId,
      metadata: {
        fields: Object.keys(input),
        role: input.role ?? null,
        status: input.status ?? null,
      },
    });
    return this.view(updated);
  }
}
