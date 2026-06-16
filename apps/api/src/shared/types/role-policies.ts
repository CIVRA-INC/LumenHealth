import type { Permission, RolePolicy, UserRole } from "@lumen/types";

const rolePolicies: Record<UserRole, Permission[]> = {
  owner: ["auth:read", "auth:write", "billing:read", "billing:write", "patient:read", "patient:write"],
  admin: ["auth:read", "billing:read", "billing:write", "patient:read", "patient:write"],
  clinician: ["patient:read", "patient:write"],
  cashier: ["billing:read", "billing:write"],
};

export function getRolePolicy(role: UserRole): RolePolicy {
  return { role, permissions: rolePolicies[role] };
}
