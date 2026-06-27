import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Consent, ConsentStatus, ConsentType } from './entities/consent.entity';

@Injectable()
export class ConsentService {
  constructor(
    @InjectRepository(Consent)
    private readonly consentRepo: Repository<Consent>,
  ) {}

  async grant(patientId: string, consentType: ConsentType, grantedTo?: string, expiresAt?: Date): Promise<Consent> {
    // Check for existing active consent of same type
    const existing = await this.consentRepo.findOne({
      where: { patientId, consentType, status: ConsentStatus.GRANTED },
    });
    if (existing) throw new ConflictException(`Active consent of type ${consentType} already exists`);

    const consent = this.consentRepo.create({
      patientId, consentType, grantedTo,
      status: ConsentStatus.GRANTED,
      grantedAt: new Date(),
      expiresAt,
    });
    return this.consentRepo.save(consent);
  }

  async revoke(id: string, patientId: string): Promise<Consent> {
    const consent = await this.consentRepo.findOne({ where: { id, patientId } });
    if (!consent) throw new NotFoundException(`Consent ${id} not found`);
    if (consent.status !== ConsentStatus.GRANTED)
      throw new ConflictException(`Cannot revoke consent with status ${consent.status}`);
    consent.status = ConsentStatus.REVOKED;
    consent.revokedAt = new Date();
    return this.consentRepo.save(consent);
  }

  async findByPatient(patientId: string): Promise<Consent[]> {
    return this.consentRepo.find({
      where: { patientId },
      order: { createdAt: 'DESC' },
    });
  }

  async hasActiveConsent(patientId: string, consentType: ConsentType): Promise<boolean> {
    const consent = await this.consentRepo.findOne({
      where: { patientId, consentType, status: ConsentStatus.GRANTED },
    });
    if (!consent) return false;
    if (consent.expiresAt && consent.expiresAt < new Date()) return false;
    return true;
  }
}
