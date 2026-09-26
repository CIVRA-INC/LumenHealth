import { Controller, Post, Get, Delete, Body, Req, Res, Param, HttpException, HttpStatus, UseGuards, Query } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { SendInvitationRequest, AcceptInvitationRequest, InvitationStatus } from '@lumen/types';
import { validateSendInvitation, validateAcceptInvitation } from '../validators/invitation.validator.js';
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import { InvitationService } from '../services/invitation.service.js';

@Controller('staff/invitations')
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Post()
  @UseGuards(AuthGuard)
  send(@Body() body: SendInvitationRequest, @Req() req: Request, @Res() res: Response) {
    const role = req.auth!.role;
    if (role !== "owner" && role !== "admin") {
      throw new HttpException({ error: "AUTH_FORBIDDEN", message: "only owner or admin can send invitations" }, HttpStatus.FORBIDDEN);
    }

    const validation = validateSendInvitation(body);
    if (!validation.ok) {
      throw new HttpException({ error: "INVITATION_INVALID_INPUT", message: validation.message, field: validation.field }, HttpStatus.BAD_REQUEST);
    }

    const result = this.invitationService.sendInvitation(body, req.auth!.clinicId, req.auth!.userId);

    if ("error" in result) {
      const status = result.error === "INVITATION_ALREADY_PENDING" || result.error === "STAFF_ALREADY_EXISTS" ? HttpStatus.CONFLICT : HttpStatus.BAD_REQUEST;
      throw new HttpException(result, status);
    }

    return res.status(HttpStatus.CREATED).json(result);
  }

  @Post('accept')
  async accept(@Body() body: AcceptInvitationRequest, @Req() req: Request, @Res() res: Response) {
    const validation = validateAcceptInvitation(body);
    if (!validation.ok) {
      throw new HttpException({ error: "INVITATION_INVALID_INPUT", message: validation.message, field: validation.field }, HttpStatus.BAD_REQUEST);
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
  @UseGuards(AuthGuard)
  list(@Query('status') statusFilter: InvitationStatus | undefined, @Req() req: Request, @Res() res: Response) {
    const role = req.auth!.role;
    if (role !== "owner" && role !== "admin") {
      throw new HttpException({ error: "AUTH_FORBIDDEN", message: "only owner or admin can list invitations" }, HttpStatus.FORBIDDEN);
    }

    const invitations = this.invitationService.listInvitations(req.auth!.clinicId, statusFilter ? { status: statusFilter } : undefined);
    return res.json({ invitations });
  }

  @Delete(':invitationId')
  @UseGuards(AuthGuard)
  revoke(@Param('invitationId') invitationId: string, @Req() req: Request, @Res() res: Response) {
    const role = req.auth!.role;
    if (role !== "owner" && role !== "admin") {
      throw new HttpException({ error: "AUTH_FORBIDDEN", message: "only owner or admin can revoke invitations" }, HttpStatus.FORBIDDEN);
    }

    const result = this.invitationService.revokeInvitation(invitationId, req.auth!.clinicId);

    if ("error" in result) {
      const status = result.error === "INVITATION_NOT_FOUND" ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
      throw new HttpException(result, status);
    }

    return res.json(result);
  }
}
