import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  cancelAppointmentSchema,
  createAppointmentSchema,
  createWalkInSchema,
  listAppointmentsQuerySchema,
  type AppointmentView,
  type Page,
  type QueueView,
} from '@lumen/contracts';
import { Ctx, RequirePermissions } from '../../common/decorators';
import type { RequestContext } from '../../common/request-context';
import { parse, ZodApiBody } from '../../common/zod';
import { SchedulingService } from './scheduling.service';

@ApiTags('Scheduling')
@Controller({ version: '1' })
export class SchedulingController {
  constructor(private readonly scheduling: SchedulingService) {}

  @Get('appointments')
  @RequirePermissions('appointments.read')
  list(@Ctx() ctx: RequestContext, @Query() query: unknown): Promise<Page<AppointmentView>> {
    return this.scheduling.list(ctx, parse(listAppointmentsQuerySchema, query));
  }

  @Get('appointments/:id')
  @RequirePermissions('appointments.read')
  get(
    @Ctx() ctx: RequestContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AppointmentView> {
    return this.scheduling.get(ctx, id);
  }

  @Post('appointments')
  @RequirePermissions('appointments.write')
  @ZodApiBody(createAppointmentSchema)
  create(@Ctx() ctx: RequestContext, @Body() body: unknown): Promise<AppointmentView> {
    return this.scheduling.create(ctx, parse(createAppointmentSchema, body));
  }

  @Post('appointments/:id/check-in')
  @HttpCode(200)
  @RequirePermissions('queue.manage')
  checkIn(
    @Ctx() ctx: RequestContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AppointmentView> {
    return this.scheduling.checkIn(ctx, id);
  }

  @Post('appointments/:id/cancel')
  @HttpCode(200)
  @RequirePermissions('appointments.write')
  @ZodApiBody(cancelAppointmentSchema)
  cancel(
    @Ctx() ctx: RequestContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ): Promise<AppointmentView> {
    return this.scheduling.cancel(ctx, id, parse(cancelAppointmentSchema, body));
  }

  @Post('appointments/:id/no-show')
  @HttpCode(200)
  @RequirePermissions('appointments.write')
  noShow(
    @Ctx() ctx: RequestContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AppointmentView> {
    return this.scheduling.markNoShow(ctx, id);
  }

  @Post('queue/walk-ins')
  @RequirePermissions('queue.manage')
  @ZodApiBody(createWalkInSchema)
  walkIn(@Ctx() ctx: RequestContext, @Body() body: unknown): Promise<AppointmentView> {
    return this.scheduling.walkIn(ctx, parse(createWalkInSchema, body));
  }

  @Get('queue')
  @RequirePermissions('appointments.read')
  queue(@Ctx() ctx: RequestContext): Promise<QueueView> {
    return this.scheduling.queue(ctx);
  }
}
