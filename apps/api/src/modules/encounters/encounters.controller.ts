import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  addAddendumSchema,
  addDiagnosisSchema,
  addMedicationOrderSchema,
  closeEncounterSchema,
  encounterListQuerySchema,
  finalizeEncounterSchema,
  recordVitalsSchema,
  saveClinicalNoteSchema,
  startEncounterSchema,
  voidEncounterSchema,
  voidEntrySchema,
  type EncounterDetail,
  type EncounterView,
  type Page,
} from '@lumen/contracts';
import { Ctx, RequirePermissions } from '../../common/decorators';
import type { RequestContext } from '../../common/request-context';
import { parse, ZodApiBody } from '../../common/zod';
import { EncountersService } from './encounters.service';

@ApiTags('Encounters')
@Controller({ path: 'encounters', version: '1' })
export class EncountersController {
  constructor(private readonly encounters: EncountersService) {}

  @Get()
  @RequirePermissions('encounters.read')
  list(@Ctx() ctx: RequestContext, @Query() query: unknown): Promise<Page<EncounterView>> {
    return this.encounters.list(ctx, parse(encounterListQuerySchema, query));
  }

  @Post()
  @RequirePermissions('encounters.start')
  @ZodApiBody(startEncounterSchema)
  start(@Ctx() ctx: RequestContext, @Body() body: unknown): Promise<EncounterDetail> {
    return this.encounters.start(ctx, parse(startEncounterSchema, body));
  }

  @Get(':id')
  @RequirePermissions('encounters.read')
  get(
    @Ctx() ctx: RequestContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EncounterDetail> {
    return this.encounters.get(ctx, id);
  }

  @Put(':id/note')
  @RequirePermissions('encounters.document')
  @ZodApiBody(saveClinicalNoteSchema)
  saveNote(
    @Ctx() ctx: RequestContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ): Promise<EncounterDetail> {
    return this.encounters.saveNote(ctx, id, parse(saveClinicalNoteSchema, body));
  }

  @Post(':id/vitals')
  @RequirePermissions('vitals.record')
  @ZodApiBody(recordVitalsSchema)
  recordVitals(
    @Ctx() ctx: RequestContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ): Promise<EncounterDetail> {
    return this.encounters.recordVitals(ctx, id, parse(recordVitalsSchema, body));
  }

  @Post(':id/vitals/:vitalsId/void')
  @HttpCode(200)
  @RequirePermissions('vitals.record')
  @ZodApiBody(voidEntrySchema)
  voidVitals(
    @Ctx() ctx: RequestContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('vitalsId', ParseUUIDPipe) vitalsId: string,
    @Body() body: unknown,
  ): Promise<EncounterDetail> {
    return this.encounters.markVitalsInError(ctx, id, vitalsId, parse(voidEntrySchema, body));
  }

  @Post(':id/diagnoses')
  @RequirePermissions('encounters.document')
  @ZodApiBody(addDiagnosisSchema)
  addDiagnosis(
    @Ctx() ctx: RequestContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ): Promise<EncounterDetail> {
    return this.encounters.addDiagnosis(ctx, id, parse(addDiagnosisSchema, body));
  }

  @Delete(':id/diagnoses/:diagnosisId')
  @RequirePermissions('encounters.document')
  removeDiagnosis(
    @Ctx() ctx: RequestContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('diagnosisId', ParseUUIDPipe) diagnosisId: string,
  ): Promise<EncounterDetail> {
    return this.encounters.removeDiagnosis(ctx, id, diagnosisId);
  }

  @Post(':id/medication-orders')
  @RequirePermissions('orders.prescribe')
  @ZodApiBody(addMedicationOrderSchema)
  addOrder(
    @Ctx() ctx: RequestContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ): Promise<EncounterDetail> {
    return this.encounters.addMedicationOrder(ctx, id, parse(addMedicationOrderSchema, body));
  }

  @Delete(':id/medication-orders/:orderId')
  @RequirePermissions('orders.prescribe')
  removeOrder(
    @Ctx() ctx: RequestContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ): Promise<EncounterDetail> {
    return this.encounters.removeMedicationOrder(ctx, id, orderId);
  }

  @Post(':id/medication-orders/:orderId/cancel')
  @HttpCode(200)
  @RequirePermissions('orders.prescribe')
  @ZodApiBody(voidEntrySchema)
  cancelOrder(
    @Ctx() ctx: RequestContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() body: unknown,
  ): Promise<EncounterDetail> {
    return this.encounters.cancelMedicationOrder(ctx, id, orderId, parse(voidEntrySchema, body));
  }

  @Post(':id/finalize')
  @HttpCode(200)
  @RequirePermissions('encounters.finalize')
  @ZodApiBody(finalizeEncounterSchema)
  finalize(
    @Ctx() ctx: RequestContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ): Promise<EncounterDetail> {
    parse(finalizeEncounterSchema, body);
    return this.encounters.finalize(ctx, id);
  }

  @Post(':id/close')
  @HttpCode(200)
  @RequirePermissions('encounters.close')
  @ZodApiBody(closeEncounterSchema)
  close(
    @Ctx() ctx: RequestContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ): Promise<EncounterDetail> {
    return this.encounters.close(ctx, id, parse(closeEncounterSchema, body));
  }

  @Post(':id/void')
  @HttpCode(200)
  @RequirePermissions('encounters.void')
  @ZodApiBody(voidEncounterSchema)
  void(
    @Ctx() ctx: RequestContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ): Promise<EncounterDetail> {
    return this.encounters.void(ctx, id, parse(voidEncounterSchema, body));
  }

  @Post(':id/addenda')
  @RequirePermissions('encounters.document')
  @ZodApiBody(addAddendumSchema)
  addAddendum(
    @Ctx() ctx: RequestContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ): Promise<EncounterDetail> {
    return this.encounters.addAddendum(ctx, id, parse(addAddendumSchema, body));
  }
}
