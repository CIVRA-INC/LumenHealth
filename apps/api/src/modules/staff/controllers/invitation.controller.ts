import { uuidParamPipe } from '../../../shared/validation/id-params.js';
import { Controller, Post, Get, Delete, Body, Res, Param, HttpException, HttpStatus, UseGuards, Query, UsePipes } from '@nestjs/common';
import type { Response } from 'express';
import type { InvitationError, InvitationStatus } from '@lumen/types';
import { SendInvitationDto, AcceptInvitationDto } from '../dto/invitation.dto.js';
import { invitationValidationPipe } from '../pipes/invitation-validation.pipe.js';
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import { PermissionsGuard } from '../../../shared/guards/permissions.guard.js';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator.js';
import { AuthContext } from '../../../shared/decorators/auth-context.decorator.js';
import type { AuthContextType } from '../../../shared/types/auth-context.js';
import { InvitationService } from '../services/invitation.service.js';

const INVITATION_ERROR_STATUS: Record<InvitationError["error"], HttpStatus> = {
  INVITATION_NOT_FOUND: HttpStatus.NOT_FOUND,
  INVITATION_EXPIRED: HttpStatus.GONE,
  INVITATION_ALREADY_PENDING: HttpStatus.CONFLICT,
  INVITATION_ALREADY_ACCEPTED: HttpStatus.CONFLICT,
  INVITATION_REVOKED: HttpStatus.CONFLICT,
  INVITATION_INVALID_INPUT: HttpStatus.BAD_REQUEST,
  STAFF_ALREADY_EXISTS: HttpStatus.CONFLICT,
  STAFF_ACCESS_DENIED: HttpStatus.FORBIDDEN,
  VALIDATION_FAILED: HttpStatus.BAD_REQUEST,
};

@Controller('staff/invitations')
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Post()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('staff:write')
  @UsePipes(invitationValidationPipe)
  send(@Body() body: SendInvitationDto, @AuthContext() auth: AuthContextType, @Res() res: Response) {
    const result = this.invitationService.sendInvitation(body, auth.clinicId, auth.userId, auth.role);

    if ("error" in result) {
      throw new HttpException(result, INVITATION_ERROR_STATUS[result.error] ?? HttpStatus.BAD_REQUEST);
    }

    return res.status(HttpStatus.CREATED).json(result);
  }

  @Post('accept')
  @UsePipes(invitationValidationPipe)
  async accept(@Body() body: AcceptInvitationDto, @Res() res: Response) {
    const result = await this.invitationService.acceptInvitation(body.token, body.password, body.name);

    if ("error" in result) {
      throw new HttpException(result, INVITATION_ERROR_STATUS[result.error] ?? HttpStatus.BAD_REQUEST);
    }

    return res.status(HttpStatus.CREATED).json(result);
  }

  @Get()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('staff:read')
  list(@Query('status') statusFilter: InvitationStatus | undefined, @AuthContext() auth: AuthContextType, @Res() res: Response) {
    const invitations = this.invitationService.listInvitations(auth.clinicId, statusFilter ? { status: statusFilter } : undefined);
    return res.json({ invitations });
  }

  @Delete(':invitationId')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('staff:write')
  revoke(@Param('invitationId', uuidParamPipe()) invitationId: string, @AuthContext() auth: AuthContextType, @Res() res: Response) {
    const result = this.invitationService.revokeInvitation(invitationId, auth.clinicId);

    if ("error" in result) {
      throw new HttpException(result, INVITATION_ERROR_STATUS[result.error] ?? HttpStatus.BAD_REQUEST);
    }

    return res.json(result);
  }
}
