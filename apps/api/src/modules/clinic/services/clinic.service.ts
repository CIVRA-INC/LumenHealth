import { Injectable } from '@nestjs/common';
import type { Clinic, CreateClinicRequest, UpdateClinicRequest, UserRole } from '@lumen/types';
import { ClinicRepository } from '../repositories/clinic.repository.js';
import { generateSlug } from '../validators/clinic.validator.js';
import { recordAudit } from '../../audit/services/audit.service.js';

@Injectable()
export class ClinicService {
  constructor(private readonly clinicRepository: ClinicRepository) {}

  private uniqueSlug(base: string): string {
    let slug = base;
    let counter = 2;
    while (this.clinicRepository.findBySlug(slug)) {
      slug = `${base}-${counter}`;
      counter += 1;
    }
    return slug;
  }

  createClinic(req: CreateClinicRequest, ownerId: string, clinicId: string): Clinic {
    const now = new Date().toISOString();
    const baseSlug = generateSlug(req.name);
    const slug = this.uniqueSlug(baseSlug);

    const clinic: Clinic = {
      clinicId,
      name: req.name.trim(),
      slug,
      address: req.address.trim(),
      phone: req.phone.trim(),
      email: req.email.trim(),
      status: 'active',
      ownerId,
      createdAt: now,
      updatedAt: now,
    };

    return this.clinicRepository.save(clinic);
  }

  getClinic(clinicId: string, callerClinicId: string): Clinic | null {
    const clinic = this.clinicRepository.findById(clinicId);
    if (!clinic || clinic.clinicId !== callerClinicId) return null;
    return clinic;
  }

  updateClinic(clinicId: string, callerClinicId: string, patch: UpdateClinicRequest): Clinic | null {
    const clinic = this.getClinic(clinicId, callerClinicId);
    if (!clinic) return null;

    const updated: Clinic = {
      ...clinic,
      ...(patch.name ? { name: patch.name.trim() } : {}),
      ...(patch.address ? { address: patch.address.trim() } : {}),
      ...(patch.phone ? { phone: patch.phone.trim() } : {}),
      ...(patch.email ? { email: patch.email.trim() } : {}),
      updatedAt: new Date().toISOString(),
    };

    return this.clinicRepository.save(updated);
  }

  archiveClinic(clinicId: string, callerClinicId: string, callerActorId: string, callerRole: UserRole): Clinic | null {
    const clinic = this.getClinic(clinicId, callerClinicId);
    if (!clinic) return null;

    const archived: Clinic = {
      ...clinic,
      status: 'archived',
      updatedAt: new Date().toISOString(),
    };

    const saved = this.clinicRepository.save(archived);

    recordAudit({
      clinicId: callerClinicId,
      action: 'clinic.archived',
      actorId: callerActorId,
      actorRole: callerRole,
      targetId: clinicId,
      targetType: 'clinic',
      before: { status: clinic.status },
      after: { status: saved.status },
    });

    return saved;
  }
}
