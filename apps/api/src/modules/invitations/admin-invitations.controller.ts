import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  invitationListQuerySchema,
  inviteStaffSchema,
  type InvitationView,
  type Page,
} from '@lumen/contracts';
import { Ctx, RequirePermissions } from '../../common/decorators';
import { ForbiddenError, ValidationError } from '../../common/errors';
import type { RequestContext } from '../../common/request-context';
import { parse, ZodApiBody } from '../../common/zod';
import { canGrantRole, InvitationsService } from './invitations.service';

const actorOf = (ctx: RequestContext) => ({
  userId: ctx.userId,
  ip: ctx.ip,
  userAgent: ctx.userAgent,
  requestId: ctx.requestId,
});

/** Staff invitations for the signed-in organisation. Every call is pinned to `ctx.organizationId`. */
@ApiTags('Administration')
@Controller({ path: 'admin/invitations', version: '1' })
export class AdminInvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Get()
  @RequirePermissions('users.read')
  list(@Ctx() ctx: RequestContext, @Query() rawQuery: unknown): Promise<Page<InvitationView>> {
    const q = parse(invitationListQuerySchema, rawQuery);
    // An organisation id in the query is ignored: the scope always comes from the session.
    return this.invitations.list({ organizationId: ctx.organizationId }, q);
  }

  @Post()
  @RequirePermissions('users.manage')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ZodApiBody(inviteStaffSchema)
  async invite(@Ctx() ctx: RequestContext, @Body() body: unknown): Promise<InvitationView> {
    const input = parse(inviteStaffSchema, body);
    if (!canGrantRole(ctx.role, input.role)) throw new ForbiddenError('You cannot grant that role');
    const outside = input.branchIds.filter((id) => !ctx.accessibleBranchIds.includes(id));
    if (outside.length)
      throw new ValidationError('You can only assign branches you have access to', {
        fields: [{ path: 'branchIds', message: 'Includes a branch you cannot assign' }],
      });
    return this.invitations.create(actorOf(ctx), {
      organizationId: ctx.organizationId,
      email: input.email,
      fullName: input.fullName,
      role: input.role,
      branchIds: input.branchIds,
      invitedByUserId: ctx.userId,
    });
  }

  @Post(':id/resend')
  @RequirePermissions('users.manage')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  resend(
    @Ctx() ctx: RequestContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InvitationView> {
    return this.invitations.resend(actorOf(ctx), id, ctx.organizationId);
  }

  @Post(':id/revoke')
  @RequirePermissions('users.manage')
  @HttpCode(200)
  revoke(
    @Ctx() ctx: RequestContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InvitationView> {
    return this.invitations.revoke(actorOf(ctx), id, ctx.organizationId);
  }
}
