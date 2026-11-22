import { ClinicIdParamPipe } from '../../../shared/validation/id-params.js';
import { Controller, Post, Get, Patch, Delete, Body, Res, Param, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import {
  CreateClinicRequestSchema,
  UpdateClinicRequestSchema,
  type CreateClinicRequest,
  type UpdateClinicRequest,
} from '@lumen/types';
import { ZodValidationPipe } from '../../../shared/validation/zod.pipe.js';
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import { PermissionsGuard } from '../../../shared/guards/permissions.guard.js';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator.js';
import { ClinicScopeGuard } from '../guards/clinic-scope.guard.js';
import { RequireClinicScope } from '../decorators/require-clinic-scope.decorator.js';
import { AuthContext } from '../../../shared/decorators/auth-context.decorator.js';
import type { AuthContextType } from '../../../shared/types/auth-context.js';
import { ClinicService } from '../services/clinic.service.js';

@Controller('clinics')
@UseGuards(AuthGuard)
export class ClinicController {
  constructor(private readonly clinicService: ClinicService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('clinic:write')
  create(@Body(new ZodValidationPipe(CreateClinicRequestSchema, 'CLINIC_INVALID_INPUT')) body: CreateClinicRequest, @AuthContext() auth: AuthContextType, @Res() res: Response) {
    const clinic = this.clinicService.createClinic(body, auth.userId, auth.clinicId);
    return res.status(HttpStatus.CREATED).json({ clinic });
  }

  @Get(':clinicId')
  @UseGuards(PermissionsGuard, ClinicScopeGuard)
  @RequirePermissions('clinic:read')
  @RequireClinicScope('clinicId')
  get(@Param('clinicId', new ClinicIdParamPipe()) clinicId: string, @AuthContext() auth: AuthContextType, @Res() res: Response) {
    const clinic = this.clinicService.getClinic(clinicId, auth.clinicId);
    if (!clinic) {
      throw new HttpException({ error: "CLINIC_NOT_FOUND", message: "clinic not found" }, HttpStatus.NOT_FOUND);
    }
    return res.json({ clinic });
  }

  @Patch(':clinicId')
  @UseGuards(PermissionsGuard, ClinicScopeGuard)
  @RequirePermissions('clinic:write')
  @RequireClinicScope('clinicId')
  update(@Param('clinicId', new ClinicIdParamPipe()) clinicId: string, @Body(new ZodValidationPipe(UpdateClinicRequestSchema, 'CLINIC_INVALID_INPUT')) body: UpdateClinicRequest, @AuthContext() auth: AuthContextType, @Res() res: Response) {
    const clinic = this.clinicService.updateClinic(clinicId, auth.clinicId, body);
    if (!clinic) {
      throw new HttpException({ error: "CLINIC_NOT_FOUND", message: "clinic not found" }, HttpStatus.NOT_FOUND);
    }
    return res.json({ clinic });
  }

  @Delete(':clinicId')
  @UseGuards(PermissionsGuard, ClinicScopeGuard)
  @RequirePermissions('clinic:write')
  @RequireClinicScope('clinicId')
  archive(@Param('clinicId', new ClinicIdParamPipe()) clinicId: string, @AuthContext() auth: AuthContextType, @Res() res: Response) {
    const clinic = this.clinicService.archiveClinic(clinicId, auth.clinicId, auth.userId, auth.role);
    if (!clinic) {
      throw new HttpException({ error: "CLINIC_NOT_FOUND", message: "clinic not found" }, HttpStatus.NOT_FOUND);
    }
    return res.json({ ok: true });
  }
}
