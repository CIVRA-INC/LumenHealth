import { Controller, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { OrgUserView } from '@lumen/contracts';
import { Ctx, RequirePermissions } from '../../common/decorators';
import type { RequestContext } from '../../common/request-context';
import { StaffService } from './staff.service';

/**
 * Staff offboarding (#1457). Exposed at both `/staff` (the contract in the issue) and
 * `/admin/users` (the current administration route prefix).
 */
@ApiTags('Staff')
@Controller({ path: ['staff', 'admin/users'], version: '1' })
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Patch(':staffId/deactivate')
  @ApiOperation({ summary: 'Deactivate a staff member and revoke their sessions' })
  @RequirePermissions('users.manage')
  async deactivate(
    @Ctx() ctx: RequestContext,
    @Param('staffId', ParseUUIDPipe) staffId: string,
  ): Promise<OrgUserView> {
    return this.staff.deactivate(ctx, staffId);
  }

  @Patch(':staffId/reactivate')
  @ApiOperation({ summary: 'Reactivate a deactivated staff member' })
  @RequirePermissions('users.manage')
  async reactivate(
    @Ctx() ctx: RequestContext,
    @Param('staffId', ParseUUIDPipe) staffId: string,
  ): Promise<OrgUserView> {
    return this.staff.reactivate(ctx, staffId);
  }
}
