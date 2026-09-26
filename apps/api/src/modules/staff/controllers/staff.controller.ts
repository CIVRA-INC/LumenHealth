import { Controller, Get, Patch, Body, Param, Req, Res, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { UpdateStaffRoleRequest } from '@lumen/types';
import { StaffService } from '../services/staff.service.js';
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import { PermissionsGuard } from '../../../shared/guards/permissions.guard.js';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator.js';

@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('staff:read')
  list(@Req() req: Request, @Res() res: Response) {
    const clinicId = req.auth!.clinicId;
    const staff = this.staffService.listStaff(clinicId);
    return res.json({ staff });
  }

  @Patch(':staffId/role')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('staff:write')
  updateRole(
    @Param('staffId') staffId: string,
    @Body() body: UpdateStaffRoleRequest,
    @Req() req: Request,
    @Res() res: Response
  ) {
    if (!body || !body.role) {
      throw new HttpException({ error: "VALIDATION_FAILED", message: "role is required" }, HttpStatus.BAD_REQUEST);
    }
    const validRoles = ["admin", "clinician", "cashier"];
    if (!validRoles.includes(body.role)) {
      throw new HttpException({ error: "VALIDATION_FAILED", field: "role", message: "must be admin, clinician, or cashier" }, HttpStatus.BAD_REQUEST);
    }

    const result = this.staffService.updateStaffRole(
      staffId,
      body,
      req.auth!.clinicId,
      req.auth!.userId,
      req.auth!.role
    );

    if ('error' in result) {
      if (result.error === 'STAFF_NOT_FOUND') {
        throw new HttpException(result, HttpStatus.NOT_FOUND);
      }
      if (result.error === 'STAFF_CANNOT_SELF_UPDATE') {
        throw new HttpException(result, HttpStatus.FORBIDDEN);
      }
      throw new HttpException(result, HttpStatus.BAD_REQUEST);
    }

    return res.json({ staff: result });
  }
}
