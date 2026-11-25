import { z } from 'zod';
import type { Permission, Role } from './permissions';

export const MIN_PASSWORD_LENGTH = 12;

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
  .max(128, 'Password is too long');

export const loginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const switchContextSchema = z.object({
  organizationId: z.uuid().optional(),
  branchId: z.uuid().optional(),
});
export type SwitchContextInput = z.infer<typeof switchContextSchema>;

export interface BranchSummary {
  id: string;
  name: string;
  code: string;
}

export interface MembershipSummary {
  organizationId: string;
  organizationName: string;
  role: Role;
}

/** The authenticated principal plus its active organisation and branch. */
export interface SessionView {
  user: { id: string; email: string; fullName: string; mustChangePassword: boolean };
  organization: { id: string; name: string; timezone: string };
  role: Role;
  permissions: Permission[];
  branch: BranchSummary;
  /** Branches this membership may work in. */
  branches: BranchSummary[];
  /** Other organisations the user belongs to. */
  memberships: MembershipSummary[];
}
