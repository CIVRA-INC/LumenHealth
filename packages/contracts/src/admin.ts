import { z } from 'zod';
import { paginationQuerySchema, sortDirectionSchema } from './common';
import { passwordSchema } from './auth';
import { roleSchema } from './permissions';

export const userStatusSchema = z.enum(['ACTIVE', 'DISABLED']);
export type UserStatus = z.infer<typeof userStatusSchema>;

export const createUserSchema = z.object({
  email: z.email().max(254),
  fullName: z.string().trim().min(2).max(120),
  role: roleSchema,
  branchIds: z.array(z.uuid()).min(1, 'Assign at least one branch'),
  /** Temporary password. The user must change it at first sign-in. */
  temporaryPassword: passwordSchema,
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateMembershipSchema = z
  .object({
    role: roleSchema.optional(),
    status: userStatusSchema.optional(),
    branchIds: z.array(z.uuid()).min(1).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');
export type UpdateMembershipInput = z.infer<typeof updateMembershipSchema>;

export interface OrgUserView {
  membershipId: string;
  userId: string;
  email: string;
  fullName: string;
  role: z.infer<typeof roleSchema>;
  status: UserStatus;
  branches: { id: string; name: string }[];
  lastLoginAt: string | null;
}

export const createBranchSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{2,12}$/, 'Use 2–12 letters, digits or hyphens'),
});
export type CreateBranchInput = z.infer<typeof createBranchSchema>;

export interface DepartmentView {
  id: string;
  branchId: string;
  name: string;
}

export interface ClinicianView {
  userId: string;
  fullName: string;
}

export const STAFF_SORTS = ['name', 'role', 'lastLogin', 'status'] as const;
export const staffListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(80).optional(),
  role: roleSchema.optional(),
  status: userStatusSchema.optional(),
  sort: z.enum(STAFF_SORTS).default('name'),
  order: sortDirectionSchema.optional(),
});
export type StaffListQuery = z.infer<typeof staffListQuerySchema>;
