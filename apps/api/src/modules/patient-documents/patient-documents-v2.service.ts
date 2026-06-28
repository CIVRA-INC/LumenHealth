import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { PatientDocument, DocumentStatus, DocumentType } from './entities/patient-document.entity';

export interface DocumentQueryOptions {
  status?: DocumentStatus;
  documentType?: DocumentType;
  search?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class PatientDocumentsQueryService {
  constructor(
    @InjectRepository(PatientDocument)
    private readonly repo: Repository<PatientDocument>,
  ) {}

  async findWithFilters(patientId: string, opts: DocumentQueryOptions = {}): Promise<{ items: PatientDocument[]; total: number }> {
    const where: any = { patientId };
    if (opts.status)       where.status = opts.status;
    if (opts.documentType) where.documentType = opts.documentType;
    if (opts.search)       where.fileName = Like(`%${opts.search}%`);
    const [items, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: opts.limit  ?? 20,
      skip: opts.offset ?? 0,
    });
    return { items, total };
  }

  async countByStatus(patientId: string): Promise<Record<DocumentStatus, number>> {
    const rows = await this.repo.createQueryBuilder('d')
      .select('d.status', 'status')
      .addSelect('COUNT(d.id)', 'count')
      .where('d.patientId = :patientId', { patientId })
      .groupBy('d.status')
      .getRawMany();
    const result = {} as Record<DocumentStatus, number>;
    for (const s of Object.values(DocumentStatus)) result[s] = 0;
    for (const row of rows) result[row.status as DocumentStatus] = Number(row.count);
    return result;
  }
}
