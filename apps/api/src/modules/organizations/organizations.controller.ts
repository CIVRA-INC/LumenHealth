import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  createBranchSchema,
  type BranchSummary,
  type ClinicianView,
  type DepartmentView,
} from '@lumen/contracts';
import { z } from 'zod';
import { Authenticated, Ctx, RequirePermissions } from '../../common/decorators';
import { ConflictError, NotFoundError } from '../../common/errors';
import type { RequestContext } from '../../common/request-context';
import { parse, ZodApiBody } from '../../common/zod';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';

const createDepartmentSchema = z.object({ name: z.string().trim().min(2).max(80) });

@ApiTags('Organization')
@Controller({ version: '1' })
export class OrganizationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Branches the signed-in user may work in. */
  @Get('branches')
  @Authenticated()
  async branches(@Ctx() ctx: RequestContext): Promise<BranchSummary[]> {
    const rows = await this.prisma.branch.findMany({
      where: {
        organizationId: ctx.organizationId,
        id: { in: [...ctx.accessibleBranchIds] },
        active: true,
      },
      orderBy: { name: 'asc' },
    });
    return rows.map((b) => ({ id: b.id, name: b.name, code: b.code }));
  }

  @Post('branches')
  @RequirePermissions('org.manage')
  @ZodApiBody(createBranchSchema)
  async createBranch(@Ctx() ctx: RequestContext, @Body() body: unknown): Promise<BranchSummary> {
    const input = parse(createBranchSchema, body);
    const exists = await this.prisma.branch.findUnique({
      where: { organizationId_code: { organizationId: ctx.organizationId, code: input.code } },
    });
    if (exists) throw new ConflictError(`A branch with code ${input.code} already exists`);
    const branch = await this.prisma.branch.create({
      data: { organizationId: ctx.organizationId, name: input.name, code: input.code },
    });
    // The creating administrator can use the new branch straight away.
    await this.prisma.membershipBranch.create({
      data: {
        membershipId: ctx.membershipId,
        branchId: branch.id,
        organizationId: ctx.organizationId,
      },
    });
    await this.audit.recordStandalone(ctx, {
      action: 'branch.create',
      resourceType: 'branch',
      resourceId: branch.id,
    });
    return { id: branch.id, name: branch.name, code: branch.code };
  }

  @Get('departments')
  @Authenticated()
  async departments(
    @Ctx() ctx: RequestContext,
    @Query('branchId') branchId?: string,
  ): Promise<DepartmentView[]> {
    const id = branchId ?? ctx.branchId;
    if (!ctx.accessibleBranchIds.includes(id)) return [];
    const rows = await this.prisma.tenant(ctx.organizationId, (tx) =>
      tx.department.findMany({
        where: { organizationId: ctx.organizationId, branchId: id },
        orderBy: { name: 'asc' },
      }),
    );
    return rows.map((d) => ({ id: d.id, branchId: d.branchId, name: d.name }));
  }

  @Post('branches/:branchId/departments')
  @RequirePermissions('org.manage')
  @ZodApiBody(createDepartmentSchema)
  async createDepartment(
    @Ctx() ctx: RequestContext,
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Body() body: unknown,
  ): Promise<DepartmentView> {
    const input = parse(createDepartmentSchema, body);
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, organizationId: ctx.organizationId },
    });
    if (!branch) throw new NotFoundError('Branch');
    const department = await this.prisma.tenant(ctx.organizationId, async (tx) => {
      const created = await tx.department.create({
        data: { organizationId: ctx.organizationId, branchId, name: input.name },
      });
      await this.audit.record(tx, ctx, {
        action: 'department.create',
        resourceType: 'department',
        resourceId: created.id,
      });
      return created;
    });
    return { id: department.id, branchId: department.branchId, name: department.name };
  }

  /** Active clinicians who can be assigned appointments in the current branch. */
  @Get('clinicians')
  @RequirePermissions('appointments.read')
  @HttpCode(200)
  async clinicians(@Ctx() ctx: RequestContext): Promise<ClinicianView[]> {
    const rows = await this.prisma.membership.findMany({
      where: {
        organizationId: ctx.organizationId,
        role: 'CLINICIAN',
        status: 'ACTIVE',
        user: { status: 'ACTIVE' },
        branches: { some: { branchId: ctx.branchId } },
      },
      include: { user: true },
      orderBy: { user: { fullName: 'asc' } },
    });
    return rows.map((m) => ({ userId: m.userId, fullName: m.user.fullName }));
  }
}
