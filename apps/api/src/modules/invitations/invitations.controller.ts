import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  acceptInvitationSchema,
  inspectInvitationSchema,
  type InvitationInspection,
} from '@lumen/contracts';
import { Public } from '../../common/decorators';
import type { AuthedRequest } from '../../common/request-context';
import { parse, ZodApiBody } from '../../common/zod';
import { InvitationsService } from './invitations.service';

/** Unauthenticated, rate-limited endpoints used by the invitation link. The token is the credential. */
@ApiTags('Invitations')
@Controller({ path: 'invitations', version: '1' })
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Post('inspect')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ZodApiBody(inspectInvitationSchema)
  inspect(@Body() body: unknown): Promise<InvitationInspection> {
    return this.invitations.inspect(parse(inspectInvitationSchema, body).token);
  }

  @Post('accept')
  @Public()
  @HttpCode(204)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ZodApiBody(acceptInvitationSchema)
  async accept(@Body() body: unknown, @Req() req: AuthedRequest): Promise<void> {
    const input = parse(acceptInvitationSchema, body);
    await this.invitations.accept(input.token, input.password, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: String(req.id ?? ''),
    });
  }
}
