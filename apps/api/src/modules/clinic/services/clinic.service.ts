import type {
  Clinic,
  CreateClinicRequest,
  UpdateClinicRequest,
  UserRole,
} from '@lumen/types';
import { clinicStore } from '../repositories/clinic.repository.js';
import { generateSlug } from '../validators/clinic.validator.js';
import { recordAudit } from '../../audit/services/audit.service.js';
import type { RequestAuditMeta } from '../../../shared/http/audit-meta.js';

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

  if (!clinic) return null;

  if (clinic.clinicId !== callerClinicId) {
    // Distinct from "not found": the clinic exists but belongs to a different
    // tenant. Still returns null (the controller maps that to 404 so we don't
    // leak existence), but we log it — a caller probing clinic IDs they don't
    // own is useful enumeration-attempt signal (see issue #1023).
    console.warn(
      `[clinic] cross-clinic access blocked: caller clinic ${callerClinicId} attempted to access clinic ${clinicId}`,
    );
    return null;
  }
  return clinic;
}

export function updateClinic(
  clinicId: string,
  callerClinicId: string,
  patch: UpdateClinicRequest,
  actorId: string,
  actorRole: UserRole,
  meta: RequestAuditMeta = {},
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

  const saved = clinicStore.save(updated);

  recordAudit({
    clinicId: callerClinicId,
    action: 'clinic.updated',
    actorId,
    actorRole,
    targetId: clinicId,
    targetType: 'clinic',
    before: { name: clinic.name, address: clinic.address, phone: clinic.phone, email: clinic.email },
    after: { name: saved.name, address: saved.address, phone: saved.phone, email: saved.email },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return saved;
}

export function archiveClinic(
  clinicId: string,
  callerClinicId: string,
  callerActorId: string,
  callerRole: UserRole,
  meta: RequestAuditMeta = {},
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
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return saved;
}
