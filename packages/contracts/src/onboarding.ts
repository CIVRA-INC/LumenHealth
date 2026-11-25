import { z } from 'zod';
import { paginationQuerySchema } from './common';
import { roleSchema } from './permissions';

// ── Organisations (platform administration) ───────────────────────────────────

export const organizationStatusSchema = z.enum(['ACTIVE', 'SUSPENDED']);
export type OrganizationStatus = z.infer<typeof organizationStatusSchema>;

const branchCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9-]{2,12}$/, 'Use 2–12 letters, digits or hyphens');

/** Registers a hospital: the organisation, its first branch and an invitation for its first administrator. */
export const registerOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  timezone: z
    .string()
    .trim()
    .min(3)
    .max(64)
    .refine((tz) => {
      try {
        new Intl.DateTimeFormat('en', { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, 'Not a valid IANA time zone')
    .default('Africa/Lagos'),
  branch: z.object({ name: z.string().trim().min(2).max(120), code: branchCodeSchema }),
  admin: z.object({ fullName: z.string().trim().min(2).max(120), email: z.email().max(254) }),
});
export type RegisterOrganizationInput = z.infer<typeof registerOrganizationSchema>;

export const setOrganizationStatusSchema = z.object({
  status: organizationStatusSchema,
});
export type SetOrganizationStatusInput = z.infer<typeof setOrganizationStatusSchema>;

export const ORGANIZATION_SORTS = ['name', 'createdAt'] as const;
export const organizationListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(80).optional(),
  status: organizationStatusSchema.optional(),
});

export type OnboardingState = 'AWAITING_ADMIN' | 'ACTIVE';

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  status: OrganizationStatus;
  createdAt: string;
  branchCount: number;
  activeStaffCount: number;
  /** AWAITING_ADMIN until an administrator has accepted an invitation. */
  onboarding: OnboardingState;
}

// ── Invitations ───────────────────────────────────────────────────────────────

/** PENDING past its expiry is reported as EXPIRED; it is derived, never stored. */
export const invitationStateSchema = z.enum(['PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED']);
export type InvitationState = z.infer<typeof invitationStateSchema>;
export const deliveryStatusSchema = z.enum(['PENDING', 'SENT', 'FAILED']);
export type DeliveryStatus = z.infer<typeof deliveryStatusSchema>;

export const inviteStaffSchema = z.object({
  email: z.email().max(254),
  fullName: z.string().trim().min(2).max(120),
  role: roleSchema,
  branchIds: z.array(z.uuid()).min(1, 'Assign at least one branch').max(50),
});
export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;

export const invitationListQuerySchema = paginationQuerySchema.extend({
  state: invitationStateSchema.optional(),
  organizationId: z.uuid().optional(),
});
export type InvitationListQuery = z.infer<typeof invitationListQuerySchema>;

export interface InvitationView {
  id: string;
  organizationId: string;
  organizationName: string;
  email: string;
  fullName: string;
  role: z.infer<typeof roleSchema>;
  branches: { id: string; name: string }[];
  state: InvitationState;
  expiresAt: string;
  createdAt: string;
  invitedByName: string;
  /** Whether the email actually went out. `FAILED` means the invitation exists but nobody was told. */
  delivery: DeliveryStatus;
  deliveryError: string | null;
  sendCount: number;
  lastSentAt: string | null;
  acceptedAt: string | null;
}

/** Returned when an invitation is created or resent, so the operator is never misled about delivery. */
export interface InvitationResult {
  invitation: InvitationView;
}

export interface OrganizationDetail extends OrganizationSummary {
  branches: { id: string; name: string; code: string; active: boolean }[];
  administrators: {
    userId: string;
    fullName: string;
    email: string;
    status: 'ACTIVE' | 'DISABLED';
  }[];
  invitations: InvitationView[];
}

export interface RegisterOrganizationResult {
  organization: OrganizationDetail;
}

// ── Public acceptance ─────────────────────────────────────────────────────────

const tokenSchema = z.string().min(20).max(200);
export const inspectInvitationSchema = z.object({ token: tokenSchema });
export const acceptInvitationSchema = z.object({
  token: tokenSchema,
  /** New account: the password to set. Existing account: that account's current password (never changed). */
  password: z.string().min(1).max(128),
});
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;

/** What a token holder may see before accepting. `UNAVAILABLE` covers unknown and malformed tokens alike. */
export type InvitationInspection =
  | {
      state: 'PENDING';
      organizationName: string;
      email: string;
      fullName: string;
      role: z.infer<typeof roleSchema>;
      /** True when the email already has an account: the person signs in with their existing password. */
      existingAccount: boolean;
      expiresAt: string;
    }
  | { state: 'EXPIRED' | 'REVOKED' | 'ACCEPTED' | 'UNAVAILABLE'; organizationName?: string };
