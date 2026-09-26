import { Controller, Post, Get, Patch, Delete, Body, Req, Res, Param, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { CreateClinicRequest, UpdateClinicRequest } from '@lumen/types';
import { validateCreateClinic, validateUpdateClinic } from '../validators/clinic.validator.js';
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import { ClinicService } from '../services/clinic.service.js';

@Controller('clinics')
@UseGuards(AuthGuard)
export class ClinicController {
  constructor(private readonly clinicService: ClinicService) {}

  @Post()
  create(@Body() body: CreateClinicRequest, @Req() req: Request, @Res() res: Response) {
    const validation = validateCreateClinic(body);
    if (!validation.ok) {
      throw new HttpException({
        error: "CLINIC_INVALID_INPUT",
        message: validation.message,
        field: validation.field,
      }, HttpStatus.BAD_REQUEST);
    }

    const clinic = this.clinicService.createClinic(body, req.auth!.userId, req.auth!.clinicId);
    return res.status(HttpStatus.CREATED).json({ clinic });
  }

  @Get(':clinicId')
  get(@Param('clinicId') clinicId: string, @Req() req: Request, @Res() res: Response) {
    if (clinicId && clinicId !== req.auth?.clinicId) {
      throw new HttpException({ error: "AUTH_FORBIDDEN", message: "cross-clinic access denied" }, HttpStatus.FORBIDDEN);
    }
    const clinic = this.clinicService.getClinic(clinicId, req.auth!.clinicId);
    if (!clinic) {
      throw new HttpException({ error: "CLINIC_NOT_FOUND", message: "clinic not found" }, HttpStatus.NOT_FOUND);
    }
    return res.json({ clinic });
  }

  @Patch(':clinicId')
  update(@Param('clinicId') clinicId: string, @Body() body: UpdateClinicRequest, @Req() req: Request, @Res() res: Response) {
    if (clinicId && clinicId !== req.auth?.clinicId) {
      throw new HttpException({ error: "AUTH_FORBIDDEN", message: "cross-clinic access denied" }, HttpStatus.FORBIDDEN);
    }
    const validation = validateUpdateClinic(body);
    if (!validation.ok) {
      throw new HttpException({
        error: "CLINIC_INVALID_INPUT",
        message: validation.message,
        field: validation.field,
      }, HttpStatus.BAD_REQUEST);
    }

    const role = req.auth!.role;
    if (role !== "owner" && role !== "admin") {
      throw new HttpException({ error: "AUTH_FORBIDDEN", message: "insufficient role" }, HttpStatus.FORBIDDEN);
    }

    const clinic = this.clinicService.updateClinic(clinicId, req.auth!.clinicId, body);
    if (!clinic) {
      throw new HttpException({ error: "CLINIC_NOT_FOUND", message: "clinic not found" }, HttpStatus.NOT_FOUND);
    }
    return res.json({ clinic });
  }

  @Delete(':clinicId')
  archive(@Param('clinicId') clinicId: string, @Req() req: Request, @Res() res: Response) {
    if (clinicId && clinicId !== req.auth?.clinicId) {
      throw new HttpException({ error: "AUTH_FORBIDDEN", message: "cross-clinic access denied" }, HttpStatus.FORBIDDEN);
    }
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
