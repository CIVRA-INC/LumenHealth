import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentStatus, DocumentType } from '../entities/patient-document.entity';

export class QueryDocumentsDto {
  @IsEnum(DocumentStatus) @IsOptional() status?: DocumentStatus;
  @IsEnum(DocumentType)   @IsOptional() documentType?: DocumentType;
  @IsString()             @IsOptional() search?: string;
  @IsInt() @Min(1) @Max(200) @IsOptional() @Type(() => Number) limit?: number;
  @IsInt() @Min(0)           @IsOptional() @Type(() => Number) offset?: number;
}
