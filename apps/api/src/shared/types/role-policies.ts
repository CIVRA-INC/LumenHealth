import type { Permission, RolePolicy, UserRole } from "@lumen/types";

const rolePolicies: Record<UserRole, Permission[]> = {
  owner: ["auth:read", "auth:write", "billing:read", "billing:write", "patient:read", "patient:write", "clinic:read", "clinic:write", "staff:read", "staff:write"],
  admin: ["auth:read", "billing:read", "billing:write", "patient:read", "patient:write", "clinic:read", "staff:read", "staff:write"],
  clinician: ["auth:read", "patient:read", "patient:write", "clinic:read", "staff:read"],
  cashier: ["auth:read", "billing:read", "billing:write", "clinic:read"],
  // Used for automated/internal actors (e.g. the stellar-service anchoring job)
  // recording audit events on their own behalf — not an authenticatable user role.
  system: [],
};

export function getRolePolicy(role: UserRole): RolePolicy {
  return { role, permissions: rolePolicies[role] };
}
