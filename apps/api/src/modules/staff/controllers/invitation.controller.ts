import { uuidParamPipe } from '../../../shared/validation/id-params.js';
import { Controller, Post, Get, Delete, Body, Res, Param, HttpException, HttpStatus, UseGuards, Query, UsePipes, Ip, Headers } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Response } from 'express';
import type { InvitationStatus } from '@lumen/types';
import { SendInvitationDto, AcceptInvitationDto, ListInvitationsQueryDto } from '../dto/invitation.dto.js';
import { invitationValidationPipe } from '../pipes/invitation-validation.pipe.js';
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import { PermissionsGuard } from '../../../shared/guards/permissions.guard.js';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator.js';
import { AuthContext } from '../../../shared/decorators/auth-context.decorator.js';
import type { AuthContextType } from '../../../shared/types/auth-context.js';
import { InvitationService } from '../services/invitation.service.js';
import { limited } from '../../auth/rate-limit/rate-limiter.js';

@Controller('staff/invitations')
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Post()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('staff:write')
  @UsePipes(invitationValidationPipe)
  send(
    @Body() body: SendInvitationDto,
    @AuthContext() auth: AuthContextType,
    @Headers('x-request-id') reqId: string | undefined,
    @Res() res: Response,
  ) {
    const requestId = reqId ?? randomUUID();
    const result = this.invitationService.sendInvitation(body, auth.clinicId, auth.userId, requestId);

    if ("error" in result) {
      const status = result.error === "INVITATION_ALREADY_PENDING" || result.error === "STAFF_ALREADY_EXISTS" ? HttpStatus.CONFLICT : HttpStatus.BAD_REQUEST;
      throw new HttpException(result, status);
    }

    return res.status(HttpStatus.CREATED).json(result);
  }

  @Post('accept')
  @UsePipes(invitationValidationPipe)
  async accept(@Body() body: AcceptInvitationDto, @Ip() ip: string, @Res() res: Response) {
    if (limited(`invitation-accept:ip:${ip ?? "unknown"}`, 10) || limited(`invitation-accept:token:${body.token}`, 5)) {
      throw new HttpException({ error: "AUTH_RATE_LIMITED", message: "too many invitation accept attempts" }, HttpStatus.TOO_MANY_REQUESTS);
    }

    const result = await this.invitationService.acceptInvitation(body.token, body.password, body.name);

    if ("error" in result) {
      const status =
        result.error === "INVITATION_NOT_FOUND" ? HttpStatus.NOT_FOUND :
        result.error === "INVITATION_EXPIRED" ? HttpStatus.GONE :
        HttpStatus.CONFLICT;
      throw new HttpException(result, status);
    }

    return res.status(HttpStatus.CREATED).json(result);
  }

  @Get()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('staff:read')
  list(
    @Query(invitationValidationPipe) query: ListInvitationsQueryDto,
    @AuthContext() auth: AuthContextType,
    @Res() res: Response,
  ) {
    const statusFilter = query.status as InvitationStatus | undefined;
    const invitations = this.invitationService.listInvitations(auth.clinicId, statusFilter ? { status: statusFilter } : undefined);
    return res.json({ invitations });
  }

  @Delete(':invitationId')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('staff:write')
  revoke(
    @Param('invitationId', uuidParamPipe()) invitationId: string,
    @AuthContext() auth: AuthContextType,
    @Headers('x-request-id') reqId: string | undefined,
    @Res() res: Response,
  ) {
    const requestId = reqId ?? randomUUID();
    const result = this.invitationService.revokeInvitation(invitationId, auth.clinicId, requestId, auth.userId);

    if ("error" in result) {
      const status = result.error === "INVITATION_NOT_FOUND" ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
      throw new HttpException(result, status);
    }

    return res.json(result);
  }
}
