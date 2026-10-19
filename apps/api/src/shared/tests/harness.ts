import { AuditRepository } from '../../modules/audit/repositories/audit.repository.js';
import { ClinicRepository } from '../../modules/clinic/repositories/clinic.repository.js';
import { InvitationRepository } from '../../modules/staff/repositories/invitation.repository.js';
import { StaffRepository } from '../../modules/staff/repositories/staff.repository.js';

/**
 * Fresh repositories per test file: no shared module-level state, so files can run in parallel
 * without calling `_reset()` on the production singletons.
 */
export function createIsolatedRepositories() {
  return {
    audit: new AuditRepository(),
    clinics: new ClinicRepository(),
    staff: new StaffRepository(),
    invitations: new InvitationRepository(),
  };
}
