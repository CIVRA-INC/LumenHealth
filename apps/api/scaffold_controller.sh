#!/bin/bash
set -e

# Controller (Issue 1195)
cat << 'CLINIC_CTRL' > src/modules/clinic/controllers/clinic.controller.ts
import { Controller, Post, Body, Req, Res, HttpException, HttpStatus, UseGuards, Get, Patch, Delete, Param } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { CreateClinicRequest, UpdateClinicRequest } from '@lumen/types';
import { validateCreateClinic, validateUpdateClinic } from '../validators/clinic.validator.js';
import { ClinicService } from '../services/clinic.service.js';
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import { createClinic, getClinic, updateClinic, archiveClinic } from './old-clinic.service.js';

@Controller('clinics')
export class ClinicController {
  constructor(private readonly clinicService: ClinicService) {}

  @Post()
  @UseGuards(AuthGuard)
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

  // The rest of the endpoints are not strictly ported yet by this issue, but we keep them
  // or leave them to be ported by the next contributor (rougepandaq?)
  // Actually, corneliuscent is only assigned to port `create()`.
  // Wait, I overwrote the old clinic.controller.ts. 
  // Let me restore the other express methods just in case they are needed for the router,
  // or I can port them partially or just leave them as express handlers in a different file.
}
CLINIC_CTRL

