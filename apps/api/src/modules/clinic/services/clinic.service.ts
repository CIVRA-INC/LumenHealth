import type {
  Clinic,
  CreateClinicRequest,
  UpdateClinicRequest,
  UserRole,
} from '@lumen/types';
import { clinicStore } from '../repositories/clinic.repository.js';
import { generateSlug } from '../validators/clinic.validator.js';
import { recordAudit } from '../../audit/services/audit.service.js';

function uniqueSlug(base: string): string {
  let slug = base;
  let counter = 2;
  while (clinicStore.findBySlug(slug)) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  return slug;
}

export function createClinic(
  req: CreateClinicRequest,
  ownerId: string,
  clinicId: string,
): Clinic {
  const now = new Date().toISOString();
  const baseSlug = generateSlug(req.name);
  const slug = uniqueSlug(baseSlug);

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

  return clinicStore.save(clinic);
}

export function getClinic(
  clinicId: string,
  callerClinicId: string,
): Clinic | null {
  const clinic = clinicStore.findById(clinicId);

  if (!clinic || clinic.clinicId !== callerClinicId) return null;
  return clinic;
}

export function updateClinic(
  clinicId: string,
  callerClinicId: string,
  patch: UpdateClinicRequest,
): Clinic | null {
  const clinic = getClinic(clinicId, callerClinicId);
  if (!clinic) return null;

  const updated: Clinic = {
    ...clinic,
    ...(patch.name ? { name: patch.name.trim() } : {}),
    ...(patch.address ? { address: patch.address.trim() } : {}),
    ...(patch.phone ? { phone: patch.phone.trim() } : {}),
    ...(patch.email ? { email: patch.email.trim() } : {}),
    updatedAt: new Date().toISOString(),
  };

  return clinicStore.save(updated);
}

export function archiveClinic(
  clinicId: string,
  callerClinicId: string,
  callerActorId: string,
  callerRole: UserRole,
): Clinic | null {
  const clinic = getClinic(clinicId, callerClinicId);
  if (!clinic) return null;

  const archived: Clinic = {
    ...clinic,
    status: 'archived',
    updatedAt: new Date().toISOString(),
  };

  const saved = clinicStore.save(archived);

  // Governance-critical — see CRITICAL_AUDIT_ACTIONS in @lumen/types. Fires
  // an immediate, individual Stellar anchor rather than waiting for the
  // routine batch.
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
