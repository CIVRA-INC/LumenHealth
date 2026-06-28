import { Controller, Get, Post, Patch, Delete, Param, Body, Req, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { PatientDocumentsService } from './patient-documents.service';
import { CreatePatientDocumentDto } from './dto/create-patient-document.dto';

@Controller('patients/:patientId/documents')
export class PatientDocumentsController {
  constructor(private readonly svc: PatientDocumentsService) {}

  @Post()
  create(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreatePatientDocumentDto,
  ) {
    return this.svc.create({ ...dto, patientId });
  }

  @Get()
  findAll(@Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.svc.findAllByPatient(patientId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findOne(id);
  }

  @Patch(':id/revoke')
  @HttpCode(HttpStatus.OK)
  revoke(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.revoke(id);
  }

  @Patch(':id/archive')
  @HttpCode(HttpStatus.OK)
  archive(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.archive(id);
  }
}
