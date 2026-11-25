import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  invitationListQuerySchema,
  organizationListQuerySchema,
  registerOrganizationSchema,
  setOrganizationStatusSchema,
  type InvitationView,
  type OrganizationDetail,
  type OrganizationSummary,
  type Page,
} from '@lumen/contracts';
import { PlatformCtx, RequirePlatformPermissions } from '../../common/decorators';
import type { PlatformContext } from '../../common/request-context';
import { parse, ZodApiBody } from '../../common/zod';
import { InvitationsService } from '../invitations/invitations.service';
import { PlatformService } from './platform.service';

const actorOf = (ctx: PlatformContext) => ({
  userId: ctx.userId,
  ip: ctx.ip,
  userAgent: ctx.userAgent,
  requestId: ctx.requestId,
});

/** Platform administration. Every route names an explicit platform permission; organisation sessions are refused. */
@ApiTags('Platform')
@Controller({ path: 'platform', version: '1' })
export class PlatformController {
  constructor(
    private readonly platform: PlatformService,
    private readonly invitations: InvitationsService,
  ) {}

  @Get('organizations')
  @RequirePlatformPermissions('platform.organizations.read')
  list(@Query() rawQuery: unknown): Promise<Page<OrganizationSummary>> {
    return this.platform.list(parse(organizationListQuerySchema, rawQuery));
  }

  @Get('organizations/:id')
  @RequirePlatformPermissions('platform.organizations.read')
  detail(@Param('id', ParseUUIDPipe) id: string): Promise<OrganizationDetail> {
    return this.platform.detail(id);
  }

  @Post('organizations')
  @RequirePlatformPermissions('platform.organizations.manage')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ZodApiBody(registerOrganizationSchema)
  register(
    @PlatformCtx() ctx: PlatformContext,
    @Body() body: unknown,
  ): Promise<OrganizationDetail> {
    return this.platform.register(actorOf(ctx), parse(registerOrganizationSchema, body));
  }

  @Patch('organizations/:id/status')
  @RequirePlatformPermissions('platform.organizations.manage')
  @ZodApiBody(setOrganizationStatusSchema)
  setStatus(
    @PlatformCtx() ctx: PlatformContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ): Promise<OrganizationDetail> {
    return this.platform.setStatus(
      actorOf(ctx),
      id,
      parse(setOrganizationStatusSchema, body).status,
    );
  }

  @Get('invitations')
  @RequirePlatformPermissions('platform.organizations.read')
  listInvitations(@Query() rawQuery: unknown): Promise<Page<InvitationView>> {
    const q = parse(invitationListQuerySchema, rawQuery);
    return this.invitations.list({ organizationId: q.organizationId }, q);
  }

  @Post('invitations/:id/resend')
  @RequirePlatformPermissions('platform.invitations.manage')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  resend(
    @PlatformCtx() ctx: PlatformContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InvitationView> {
    return this.invitations.resend(actorOf(ctx), id);
  }

  @Post('invitations/:id/revoke')
  @RequirePlatformPermissions('platform.invitations.manage')
  @HttpCode(200)
  revoke(
    @PlatformCtx() ctx: PlatformContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InvitationView> {
    return this.invitations.revoke(actorOf(ctx), id);
  }
}
