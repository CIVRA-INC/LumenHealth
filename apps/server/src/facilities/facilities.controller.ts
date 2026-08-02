import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FacilitiesService } from './facilities.service';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/permissions.decorator';

@ApiTags('Facilities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('facilities')
export class FacilitiesController {
  constructor(private readonly facilitiesService: FacilitiesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new facility for the organization' })
  @RequirePermissions('facilities:write')
  async create(@Request() req: any, @Body() dto: CreateFacilityDto) {
    return this.facilitiesService.create(req.user.orgId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all facilities in the organization' })
  @RequirePermissions('facilities:read')
  async findAll(@Request() req: any) {
    return this.facilitiesService.findAll(req.user.orgId);
  }
}
