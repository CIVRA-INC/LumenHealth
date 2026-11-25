import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/decorators';
import { PrismaService } from '../../database/prisma.service';

@ApiTags('Health')
@Controller({ path: 'health', version: '1' })
@SkipThrottle()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Liveness: the process is up. */
  @Get('live')
  @Public()
  live() {
    return { status: 'ok' };
  }

  /** Readiness: the database answers. No data is returned. */
  @Get('ready')
  @Public()
  async ready() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  }
}
