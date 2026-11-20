import { z } from "zod";

/** Roles that can be assigned to staff (the owner role is not assignable). */
export const assignableRoles = ["admin", "clinician", "cashier", "system"] as const;
export const AssignableRoleSchema = z.enum(assignableRoles);

export const UpdateStaffRoleRequestSchema = z.object({
  role: AssignableRoleSchema,
});

export type UpdateStaffRoleRequest = z.infer<typeof UpdateStaffRoleRequestSchema>;
