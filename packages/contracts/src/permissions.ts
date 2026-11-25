import { z } from 'zod';

/**
 * Permissions are the unit of authorization checked by the API.
 * Roles are static bundles of permissions (see docs/adr/0003-static-rbac.md).
 */
export const PERMISSIONS = [
  'org.manage',
  'users.read',
  'users.manage',
  'patients.read',
  'patients.write',
  'appointments.read',
  'appointments.write',
  'queue.manage',
  'encounters.read',
  'encounters.start',
  'encounters.document',
  'vitals.record',
  'orders.prescribe',
  'encounters.finalize',
  'encounters.close',
  'encounters.void',
  'audit.read',
  'dashboard.read',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const ROLES = ['ORG_ADMIN', 'CLINICIAN', 'NURSE', 'FRONT_DESK'] as const;
export const roleSchema = z.enum(ROLES);
export type Role = z.infer<typeof roleSchema>;

export const ROLE_LABELS: Record<Role, string> = {
  ORG_ADMIN: 'Administrator',
  CLINICIAN: 'Clinician',
  NURSE: 'Nurse',
  FRONT_DESK: 'Front desk',
};

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  // Administrators manage the organisation and users. They deliberately have no clinical access.
  ORG_ADMIN: [
    'org.manage',
    'users.read',
    'users.manage',
    'patients.read',
    'appointments.read',
    'audit.read',
    'dashboard.read',
  ],
  FRONT_DESK: [
    'patients.read',
    'patients.write',
    'appointments.read',
    'appointments.write',
    'queue.manage',
    'dashboard.read',
  ],
  NURSE: [
    'patients.read',
    'appointments.read',
    'queue.manage',
    'encounters.read',
    'vitals.record',
    'dashboard.read',
  ],
  CLINICIAN: [
    'patients.read',
    'appointments.read',
    'appointments.write',
    'encounters.read',
    'encounters.start',
    'encounters.document',
    'vitals.record',
    'orders.prescribe',
    'encounters.finalize',
    'encounters.close',
    'encounters.void',
    'dashboard.read',
  ],
};

export function permissionsForRole(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

// ── Platform level ────────────────────────────────────────────────────────────
// Platform permissions are a separate namespace from organisation permissions. No organisation role
// grants any of them, and no platform role grants clinical or organisation-scoped access.

export const PLATFORM_PERMISSIONS = [
  'platform.organizations.read',
  'platform.organizations.manage',
  'platform.invitations.manage',
] as const;
export type PlatformPermission = (typeof PLATFORM_PERMISSIONS)[number];

export const PLATFORM_ROLES = ['PLATFORM_ADMIN'] as const;
export const platformRoleSchema = z.enum(PLATFORM_ROLES);
export type PlatformRole = z.infer<typeof platformRoleSchema>;

export const PLATFORM_ROLE_PERMISSIONS: Record<PlatformRole, readonly PlatformPermission[]> = {
  PLATFORM_ADMIN: PLATFORM_PERMISSIONS,
};

export function permissionsForPlatformRole(role: PlatformRole): readonly PlatformPermission[] {
  return PLATFORM_ROLE_PERMISSIONS[role];
}
