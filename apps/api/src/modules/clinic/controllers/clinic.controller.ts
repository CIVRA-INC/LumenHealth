import { Controller, Post, Get, Patch, Delete, Body, Req, Res, Param, HttpException, HttpStatus, UseGuards, UsePipes } from '@nestjs/common';
import type { Request, Response } from 'express';
import { CreateClinicDto, UpdateClinicDto } from '../dto/clinic.dto.js';
import { clinicValidationPipe } from '../pipes/clinic-validation.pipe.js';
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import { ClinicScopeGuard } from '../guards/clinic-scope.guard.js';
import { ClinicService } from '../services/clinic.service.js';

@Controller('clinics')
@UseGuards(AuthGuard, ClinicScopeGuard)
export class ClinicController {
  constructor(private readonly clinicService: ClinicService) {}

  @Post()
  @UsePipes(clinicValidationPipe)
  create(@Body() body: CreateClinicDto, @Req() req: Request, @Res() res: Response) {
    const clinic = this.clinicService.createClinic(body as any, req.auth!.userId, req.auth!.clinicId);
    return res.status(HttpStatus.CREATED).json({ clinic });
  }

  @Get(':clinicId')
  get(@Param('clinicId') clinicId: string, @Req() req: Request, @Res() res: Response) {
    const clinic = this.clinicService.getClinic(clinicId, req.auth!.clinicId);
    if (!clinic) {
      throw new HttpException({ error: "CLINIC_NOT_FOUND", message: "clinic not found" }, HttpStatus.NOT_FOUND);
    }
    return res.json({ clinic });
  }

  @Patch(':clinicId')
  @UsePipes(clinicValidationPipe)
  update(@Param('clinicId') clinicId: string, @Body() body: UpdateClinicDto, @Req() req: Request, @Res() res: Response) {
    const role = req.auth!.role;
    if (role !== "owner" && role !== "admin") {
      throw new HttpException({ error: "AUTH_FORBIDDEN", message: "insufficient role" }, HttpStatus.FORBIDDEN);
    }

    const clinic = this.clinicService.updateClinic(clinicId, req.auth!.clinicId, body as any);
    if (!clinic) {
      throw new HttpException({ error: "CLINIC_NOT_FOUND", message: "clinic not found" }, HttpStatus.NOT_FOUND);
    }
    return res.json({ clinic });
  }

  @Delete(':clinicId')
  archive(@Param('clinicId') clinicId: string, @Req() req: Request, @Res() res: Response) {
    if (req.auth!.role !== "owner") {
      throw new HttpException({ error: "AUTH_FORBIDDEN", message: "only the owner may archive a clinic" }, HttpStatus.FORBIDDEN);
    }

    const clinic = this.clinicService.archiveClinic(clinicId, req.auth!.clinicId, req.auth!.userId, req.auth!.role);
    if (!clinic) {
      throw new HttpException({ error: "CLINIC_NOT_FOUND", message: "clinic not found" }, HttpStatus.NOT_FOUND);
    }
    return res.json({ ok: true });
  }
}
