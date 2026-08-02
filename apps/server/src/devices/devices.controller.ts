import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { DevicesService } from './devices.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Devices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new device for the user' })
  async register(
    @Request() req: any,
    @Body() dto: { deviceId: string; name: string },
  ) {
    return this.devicesService.registerDevice(
      req.user.userId,
      dto.deviceId,
      dto.name,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List active devices/sessions for the user' })
  async getMyDevices(@Request() req: any) {
    return this.devicesService.getMyDevices(req.user.userId);
  }

  @Delete(':deviceId')
  @ApiOperation({ summary: 'Revoke a specific device session' })
  async revokeDevice(@Request() req: any, @Param('deviceId') deviceId: string) {
    return this.devicesService.revokeDevice(req.user.userId, deviceId);
  }
}
