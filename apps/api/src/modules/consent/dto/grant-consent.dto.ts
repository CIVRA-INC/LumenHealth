import { IsEnum, IsISO8601, IsOptional, IsUUID } from 'class-validator';
import { ConsentType } from '../entities/consent.entity';

export class GrantConsentDto {
  @IsEnum(ConsentType)
  consentType: ConsentType;

  @IsUUID()
  @IsOptional()
  grantedTo?: string;

  @IsISO8601()
  @IsOptional()
  expiresAt?: string;

  @IsOptional()
  notes?: string;
}

export class RevokeConsentDto {
  @IsUUID()
  id: string;
}

export class ConsentQueryDto {
  @IsEnum(ConsentType)
  @IsOptional()
  consentType?: ConsentType;

  @IsOptional()
  activeOnly?: boolean;
}
