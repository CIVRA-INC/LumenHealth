import { Controller, Post, Get, Delete, Body, Req, Res, Param, HttpException, HttpStatus, UseGuards, Query, UsePipes } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { InvitationStatus } from '@lumen/types';
import { SendInvitationDto, AcceptInvitationDto } from '../dto/invitation.dto.js';
import { invitationValidationPipe } from '../pipes/invitation-validation.pipe.js';
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import { PermissionsGuard } from '../../../shared/guards/permissions.guard.js';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator.js';
import { InvitationService } from '../services/invitation.service.js';

@Controller('staff/invitations')
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Post()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('staff:write')
  @UsePipes(invitationValidationPipe)
  send(@Body() body: SendInvitationDto, @Req() req: Request, @Res() res: Response) {
    const result = this.invitationService.sendInvitation(body, req.auth!.clinicId, req.auth!.userId);

    if ("error" in result) {
      const status = result.error === "INVITATION_ALREADY_PENDING" || result.error === "STAFF_ALREADY_EXISTS" ? HttpStatus.CONFLICT : HttpStatus.BAD_REQUEST;
      throw new HttpException(result, status);
    }

    return res.status(HttpStatus.CREATED).json(result);
  }

  @Post('accept')
  @UsePipes(invitationValidationPipe)
  async accept(@Body() body: AcceptInvitationDto, @Req() req: Request, @Res() res: Response) {
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
  list(@Query('status') statusFilter: InvitationStatus | undefined, @Req() req: Request, @Res() res: Response) {
    const invitations = this.invitationService.listInvitations(req.auth!.clinicId, statusFilter ? { status: statusFilter } : undefined);
    return res.json({ invitations });
  }

  @Delete(':invitationId')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('staff:write')
  revoke(@Param('invitationId') invitationId: string, @Req() req: Request, @Res() res: Response) {
    const result = this.invitationService.revokeInvitation(invitationId, req.auth!.clinicId);

    if ("error" in result) {
      const status = result.error === "INVITATION_NOT_FOUND" ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
      throw new HttpException(result, status);
    }

    return res.json(result);
  }
}
