import { Controller, Post, Get, Patch, Delete, Body, Res, Param, HttpException, HttpStatus, UseGuards, UsePipes } from '@nestjs/common';
import type { Response } from 'express';
import { CreateClinicDto, UpdateClinicDto } from '../dto/clinic.dto.js';
import { clinicValidationPipe } from '../pipes/clinic-validation.pipe.js';
import { AuthGuard } from '../../auth/guards/auth.guard.js';
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
  @UsePipes(clinicValidationPipe)
  create(@Body() body: CreateClinicDto, @AuthContext() auth: AuthContextType, @Res() res: Response) {
    const clinic = this.clinicService.createClinic(body as any, auth.userId, auth.clinicId);
    return res.status(HttpStatus.CREATED).json({ clinic });
  }

  @Get(':clinicId')
  @UseGuards(ClinicScopeGuard)
  @RequireClinicScope('clinicId')
  get(@Param('clinicId') clinicId: string, @AuthContext() auth: AuthContextType, @Res() res: Response) {
    const clinic = this.clinicService.getClinic(clinicId, auth.clinicId);
    if (!clinic) {
      throw new HttpException({ error: "CLINIC_NOT_FOUND", message: "clinic not found" }, HttpStatus.NOT_FOUND);
    }
    return res.json({ clinic });
  }

  @Patch(':clinicId')
  @UseGuards(ClinicScopeGuard)
  @RequireClinicScope('clinicId')
  @UsePipes(clinicValidationPipe)
  update(@Param('clinicId') clinicId: string, @Body() body: UpdateClinicDto, @AuthContext() auth: AuthContextType, @Res() res: Response) {
    const role = auth.role;
    if (role !== "owner" && role !== "admin") {
      throw new HttpException({ error: "AUTH_FORBIDDEN", message: "insufficient role" }, HttpStatus.FORBIDDEN);
    }

    const clinic = this.clinicService.updateClinic(clinicId, auth.clinicId, body as any);
    if (!clinic) {
      throw new HttpException({ error: "CLINIC_NOT_FOUND", message: "clinic not found" }, HttpStatus.NOT_FOUND);
    }
    return res.json({ clinic });
  }

  @Delete(':clinicId')
  @UseGuards(ClinicScopeGuard)
  @RequireClinicScope('clinicId')
  archive(@Param('clinicId') clinicId: string, @AuthContext() auth: AuthContextType, @Res() res: Response) {
    if (auth.role !== "owner") {
      throw new HttpException({ error: "AUTH_FORBIDDEN", message: "only the owner may archive a clinic" }, HttpStatus.FORBIDDEN);
    }

    const clinic = this.clinicService.archiveClinic(clinicId, auth.clinicId, auth.userId, auth.role);
    if (!clinic) {
      throw new HttpException({ error: "CLINIC_NOT_FOUND", message: "clinic not found" }, HttpStatus.NOT_FOUND);
    }
    return res.json({ ok: true });
  }
}
