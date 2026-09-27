import { SetMetadata } from '@nestjs/common';

/** Metadata key holding the route param name that carries the clinic id. */
export const CLINIC_SCOPE_PARAM = 'clinicScopeParam';

/**
 * Enforces that the `:clinicId` route param matches the caller's clinic.
 *
 * Usage:
 *   @Get(':clinicId')
 *   @UseGuards(AuthGuard, ClinicScopeGuard)
 *   @RequireClinicScope('clinicId')
 *   get(...)
 *
 * The param name is metadata rather than a constructor argument so the guard can
 * be registered once at the controller level and still check each route's own
 * param name. Read by `ClinicScopeGuard` via `Reflector`.
 *
 * Why 403 here but 404 in repositories:
 *   The guard fires before any DB lookup, so it can only see the URL param.
 *   Repositories must return 404 for cross-clinic IDs (avoids confirming
 *   existence). This is an early fast-fail for obvious mismatches.
 */
export const RequireClinicScope = (paramName = 'clinicId') =>
  SetMetadata(CLINIC_SCOPE_PARAM, paramName);
