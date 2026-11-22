import { describe, expect, it } from "vitest";
import { Reflector } from "@nestjs/core";
import type { ExecutionContext } from "@nestjs/common";
import { HttpException } from "@nestjs/common";
import type { Permission, UserRole } from "@lumen/types";
import { PermissionsGuard } from "../guards/permissions.guard.js";
import { RolePolicyService } from "../role-policy/role-policy.service.js";
import { ClinicScopeGuard } from "../../modules/clinic/guards/clinic-scope.guard.js";

const ALL_PERMISSIONS: Permission[] = [
  "auth:read",
  "auth:write",
  "billing:read",
  "billing:write",
  "patient:read",
  "patient:write",
  "clinic:read",
  "clinic:write",
  "staff:read",
  "staff:write",
];

const ALL_ROLES: UserRole[] = ["owner", "admin", "clinician", "cashier", "system"];

function fakeContext(opts: {
  role?: UserRole;
  required?: Permission[];
  params?: Record<string, string>;
  path?: string;
  method?: string;
}): ExecutionContext {
  const req: any = {
    auth: opts.role ? { role: opts.role, clinicId: "clinic-a", userId: "u1" } : undefined,
    params: opts.params ?? {},
    path: opts.path ?? "/test",
    method: opts.method ?? "GET",
  };
  const handler = () => undefined;
  if (opts.required) {
    Reflect.defineMetadata("permissions", opts.required, handler);
  }
  return {
    getHandler: () => handler,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe("RolePolicyService + PermissionsGuard matrix (#1476)", () => {
  const policy = new RolePolicyService();
  const guard = new PermissionsGuard(new Reflector(), policy);

  for (const role of ALL_ROLES) {
    for (const permission of ALL_PERMISSIONS) {
      const allowed = policy.getRolePolicy(role).permissions.includes(permission);
      it(`${role} ${allowed ? "can" : "cannot"} ${permission}`, () => {
        const ctx = fakeContext({ role, required: [permission] });
        if (allowed) {
          expect(guard.canActivate(ctx)).toBe(true);
        } else {
          try {
            guard.canActivate(ctx);
            throw new Error("expected forbidden");
          } catch (e) {
            expect(e).toBeInstanceOf(HttpException);
            expect((e as HttpException).getStatus()).toBe(403);
            expect((e as HttpException).getResponse()).toMatchObject({ error: "AUTH_FORBIDDEN" });
          }
        }
      });
    }
  }

  it("returns 401 when req.auth.role is missing", () => {
    const ctx = fakeContext({ required: ["staff:read"] });
    try {
      guard.canActivate(ctx);
      throw new Error("expected unauthorized");
    } catch (e) {
      expect(e).toBeInstanceOf(HttpException);
      expect((e as HttpException).getStatus()).toBe(401);
    }
  });

  it("allows when no permissions metadata is present", () => {
    const ctx = fakeContext({ role: "cashier" });
    expect(guard.canActivate(ctx)).toBe(true);
  });
});

describe("ClinicScopeGuard (#1476)", () => {
  const guard = new ClinicScopeGuard(new Reflector());

  function ctx(params: Record<string, string>, clinicId?: string): ExecutionContext {
    const req: any = { params, auth: clinicId ? { clinicId } : undefined };
    return {
      getHandler: () => () => undefined,
      getClass: () => class {},
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;
  }

  it("allows matching clinic param", () => {
    expect(guard.canActivate(ctx({ clinicId: "c1" }, "c1"))).toBe(true);
  });

  it("denies mismatched clinic param with 403 AUTH_FORBIDDEN", () => {
    try {
      guard.canActivate(ctx({ clinicId: "c2" }, "c1"));
      throw new Error("expected forbidden");
    } catch (e) {
      expect(e).toBeInstanceOf(HttpException);
      expect((e as HttpException).getStatus()).toBe(403);
      expect((e as HttpException).getResponse()).toMatchObject({ error: "AUTH_FORBIDDEN" });
    }
  });

  it("allows routes without a clinicId param", () => {
    expect(guard.canActivate(ctx({}, "c1"))).toBe(true);
  });
});
