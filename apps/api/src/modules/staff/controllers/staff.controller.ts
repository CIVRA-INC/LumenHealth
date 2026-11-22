import { uuidParamPipe } from '../../../shared/validation/id-params.js';
import { Controller, Get, Patch, Body, Param, Query, Res, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import type { StaffError, UpdateStaffRoleRequest } from '@lumen/types';
import { StaffService } from '../services/staff.service.js';
import { ListStaffQueryDto } from '../dto/staff.dto.js';
import { staffValidationPipe } from '../pipes/staff-validation.pipe.js';
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import { PermissionsGuard } from '../../../shared/guards/permissions.guard.js';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator.js';
import { AuthContext } from '../../../shared/decorators/auth-context.decorator.js';
import type { AuthContextType } from '../../../shared/types/auth-context.js';

const STAFF_ERROR_STATUS: Record<StaffError["error"], HttpStatus> = {
  STAFF_NOT_FOUND: HttpStatus.NOT_FOUND,
  STAFF_CANNOT_SELF_UPDATE: HttpStatus.FORBIDDEN,
  STAFF_LAST_OWNER: HttpStatus.BAD_REQUEST,
  STAFF_ALREADY_EXISTS: HttpStatus.CONFLICT,
  STAFF_ACCESS_DENIED: HttpStatus.FORBIDDEN,
  STAFF_ROLE_INVALID: HttpStatus.BAD_REQUEST,
  VALIDATION_FAILED: HttpStatus.BAD_REQUEST,
};

@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('staff:read')
  list(
    @Query(staffValidationPipe) query: ListStaffQueryDto,
    @AuthContext() auth: AuthContextType,
    @Res() res: Response,
  ) {
    const staff = this.staffService.listStaff(auth.clinicId, {
      status: query.status,
      role: query.role,
      q: query.q,
    });
    return res.json({ staff });
  }

  @Patch(':staffId/role')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('staff:write')
  updateRole(
    @Param('staffId', uuidParamPipe()) staffId: string,
    @Body() body: UpdateStaffRoleRequest,
    @AuthContext() auth: AuthContextType,
    @Res() res: Response
  ) {
    if (!body || !body.role) {
      const err: StaffError = { error: "VALIDATION_FAILED", message: "role is required" };
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
    const validRoles = ["admin", "clinician", "cashier"];
    if (!validRoles.includes(body.role)) {
      const err: StaffError = { error: "VALIDATION_FAILED", field: "role", message: "must be admin, clinician, or cashier" };
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }

    const result = this.staffService.updateStaffRole(
      staffId,
      body,
      auth.clinicId,
      auth.userId,
      auth.role
    );

    if ('error' in result) {
      throw new HttpException(result, STAFF_ERROR_STATUS[result.error] ?? HttpStatus.BAD_REQUEST);
    }

    return res.json({ staff: result });
  }
}
