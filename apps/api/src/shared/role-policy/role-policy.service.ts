import { Injectable } from '@nestjs/common';
import type { Permission, RolePolicy, UserRole } from "@lumen/types";

@Injectable()
export class RolePolicyService {
  private readonly rolePolicies: Record<UserRole, Permission[]> = {
    owner: ["auth:read", "auth:write", "billing:read", "billing:write", "patient:read", "patient:write", "clinic:read", "clinic:write", "staff:read", "staff:write"],
    admin: ["auth:read", "billing:read", "billing:write", "patient:read", "patient:write", "clinic:read", "staff:read", "staff:write"],
    clinician: ["auth:read", "patient:read", "patient:write", "clinic:read", "staff:read"],
    cashier: ["auth:read", "billing:read", "billing:write", "clinic:read"],
    system: [],
  };

  getRolePolicy(role: UserRole): RolePolicy {
    return { role, permissions: this.rolePolicies[role] };
  }
}
