import type { RolePolicy } from "@lumen/types";

export function checkVisibility(policy: RolePolicy, role: string): boolean {
  return policy.allowedRoles.includes(role as any);
}
