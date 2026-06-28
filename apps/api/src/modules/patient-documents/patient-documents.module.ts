import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientDocument } from './entities/patient-document.entity';
import { PatientDocumentsService } from './patient-documents.service';
import { PatientDocumentsController } from './patient-documents.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PatientDocument])],
  providers: [PatientDocumentsService],
  controllers: [PatientDocumentsController],
  exports: [PatientDocumentsService],
})
export class PatientDocumentsModule {}
