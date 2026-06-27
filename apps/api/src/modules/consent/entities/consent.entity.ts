import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum ConsentType {
  TREATMENT       = 'treatment',
  DATA_SHARING    = 'data_sharing',
  RESEARCH        = 'research',
  MARKETING       = 'marketing',
  TELEMEDICINE    = 'telemedicine',
}

export enum ConsentStatus {
  GRANTED   = 'granted',
  REVOKED   = 'revoked',
  EXPIRED   = 'expired',
  PENDING   = 'pending',
}

@Entity('consents')
export class Consent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  patientId: string;

  @Column({ type: 'uuid', nullable: true })
  grantedTo?: string;  // clinician or org that received consent

  @Column({ type: 'enum', enum: ConsentType })
  consentType: ConsentType;

  @Column({ type: 'enum', enum: ConsentStatus, default: ConsentStatus.PENDING })
  status: ConsentStatus;

  @Column({ type: 'timestamp', nullable: true })
  grantedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
