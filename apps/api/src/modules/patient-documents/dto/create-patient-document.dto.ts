import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { DocumentType } from '../entities/patient-document.entity';

export class CreatePatientDocumentDto {
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  fileUrl: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  mimeType: string;

  @IsNumber()
  fileSizeBytes: number;

  @IsEnum(DocumentType)
  @IsOptional()
  documentType?: DocumentType;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
