import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PatientDocument, DocumentStatus } from './entities/patient-document.entity';
import { CreatePatientDocumentDto } from './dto/create-patient-document.dto';

@Injectable()
export class PatientDocumentsService {
  constructor(
    @InjectRepository(PatientDocument)
    private readonly documentRepo: Repository<PatientDocument>,
  ) {}

  async create(dto: CreatePatientDocumentDto, uploadedBy?: string): Promise<PatientDocument> {
    const document = this.documentRepo.create({ ...dto, uploadedBy });
    return this.documentRepo.save(document);
  }

  async findAllByPatient(patientId: string): Promise<PatientDocument[]> {
    return this.documentRepo.find({
      where: { patientId, status: DocumentStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<PatientDocument> {
    const doc = await this.documentRepo.findOne({ where: { id } });
    if (!doc) throw new NotFoundException(`Document ${id} not found`);
    return doc;
  }

  async revoke(id: string): Promise<PatientDocument> {
    const doc = await this.findOne(id);
    doc.status = DocumentStatus.REVOKED;
    return this.documentRepo.save(doc);
  }

  async archive(id: string): Promise<PatientDocument> {
    const doc = await this.findOne(id);
    doc.status = DocumentStatus.ARCHIVED;
    return this.documentRepo.save(doc);
  }
}
