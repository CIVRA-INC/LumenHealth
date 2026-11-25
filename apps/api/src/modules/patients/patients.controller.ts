import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  createPatientSchema,
  duplicateCheckSchema,
  patientSearchQuerySchema,
  updatePatientSchema,
  type DuplicateCandidate,
  type EncounterListItem,
  type Page,
  type PatientDetail,
  type PatientSummary,
} from '@lumen/contracts';
import { Ctx, RequirePermissions } from '../../common/decorators';
import type { RequestContext } from '../../common/request-context';
import { parse, ZodApiBody } from '../../common/zod';
import { PatientsService } from './patients.service';

@ApiTags('Patients')
@Controller({ path: 'patients', version: '1' })
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @Get()
  @RequirePermissions('patients.read')
  search(@Ctx() ctx: RequestContext, @Query() query: unknown): Promise<Page<PatientSummary>> {
    return this.patients.search(ctx, parse(patientSearchQuerySchema, query));
  }

  @Post()
  @RequirePermissions('patients.write')
  @ZodApiBody(createPatientSchema)
  create(@Ctx() ctx: RequestContext, @Body() body: unknown): Promise<PatientDetail> {
    return this.patients.create(ctx, parse(createPatientSchema, body));
  }

  @Post('duplicate-check')
  @HttpCode(200)
  @RequirePermissions('patients.write')
  @ZodApiBody(duplicateCheckSchema)
  duplicateCheck(@Ctx() ctx: RequestContext, @Body() body: unknown): Promise<DuplicateCandidate[]> {
    return this.patients.duplicateCheck(ctx, parse(duplicateCheckSchema, body));
  }

  @Get(':id')
  @RequirePermissions('patients.read')
  get(@Ctx() ctx: RequestContext, @Param('id', ParseUUIDPipe) id: string): Promise<PatientDetail> {
    return this.patients.get(ctx, id);
  }

  @Patch(':id')
  @RequirePermissions('patients.write')
  @ZodApiBody(updatePatientSchema)
  update(
    @Ctx() ctx: RequestContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ): Promise<PatientDetail> {
    return this.patients.update(ctx, id, parse(updatePatientSchema, body));
  }

  @Get(':id/encounters')
  @RequirePermissions('encounters.read')
  encounters(
    @Ctx() ctx: RequestContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EncounterListItem[]> {
    return this.patients.encounterHistory(ctx, id);
  }
}
