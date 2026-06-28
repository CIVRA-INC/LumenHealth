import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { PatientDocumentsQueryService, DocumentQueryOptions } from './patient-documents-v2.service';
import { QueryDocumentsDto } from './dto/query-documents.dto';

@Controller('patients/:patientId/documents')
export class PatientDocumentsFilteredController {
  constructor(private readonly svc: PatientDocumentsQueryService) {}

  @Get('search')
  search(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query() query: QueryDocumentsDto,
  ) {
    const opts: DocumentQueryOptions = {
      status:       query.status,
      documentType: query.documentType,
      search:       query.search,
      limit:        query.limit,
      offset:       query.offset,
    };
    return this.svc.findWithFilters(patientId, opts);
  }

  @Get('stats')
  stats(@Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.svc.countByStatus(patientId);
  }
}
