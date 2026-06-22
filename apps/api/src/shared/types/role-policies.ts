import type { Permission, RolePolicy, UserRole } from "@lumen/types";

const rolePolicies: Record<UserRole, Permission[]> = {
  owner: ["auth:read", "auth:write", "billing:read", "billing:write", "patient:read", "patient:write", "clinic:read", "clinic:write", "staff:read", "staff:write"],
  admin: ["auth:read", "billing:read", "billing:write", "patient:read", "patient:write", "clinic:read", "staff:read", "staff:write"],
  clinician: ["patient:read", "patient:write", "clinic:read", "staff:read"],
  cashier: ["billing:read", "billing:write", "clinic:read"],
};

export function getRolePolicy(role: UserRole): RolePolicy {
  return { role, permissions: rolePolicies[role] };
}
