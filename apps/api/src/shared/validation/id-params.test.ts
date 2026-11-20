import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { HttpException, ParseUUIDPipe } from "@nestjs/common";
import { AuditController } from "../../modules/audit/controllers/audit.controller.js";
import { StaffController } from "../../modules/staff/controllers/staff.controller.js";
import { InvitationController } from "../../modules/staff/controllers/invitation.controller.js";
import { ClinicController } from "../../modules/clinic/controllers/clinic.controller.js";
import { ClinicIdParamPipe, uuidParamPipe } from "./id-params.js";

const ROUTE_ARGS = "__routeArguments__";

/** The pipes attached to the path parameter `name` of `Controller.handler`. */
function pipesFor(controller: object, handler: string, name: string): unknown[] {
  const args = Reflect.getMetadata(ROUTE_ARGS, controller, handler) as
    | Record<string, { data?: string; pipes?: unknown[] }>
    | undefined;
  return Object.values(args ?? {}).find((arg) => arg.data === name)?.pipes ?? [];
}

describe("uuidParamPipe", () => {
  const pipe = uuidParamPipe();
  const meta = { type: "param" as const, data: "id" };

  it("accepts a v4 UUID", async () => {
    const id = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
    await expect(pipe.transform(id, meta)).resolves.toBe(id);
  });

  it.each(["abc", "x".repeat(500), "../../etc/passwd", "1\u0000", "3f2504e0-4f89-11d3-9a0c-0305e82c3301"])(
    "rejects %j with 400 VALIDATION_FAILED",
    async (bad) => {
      const err = await pipe.transform(bad, meta).catch((e) => e);
      expect(err).toBeInstanceOf(HttpException);
      expect((err as HttpException).getStatus()).toBe(400);
      expect((err as HttpException).getResponse()).toMatchObject({ error: "VALIDATION_FAILED" });
    },
  );
});

describe("ClinicIdParamPipe", () => {
  const pipe = new ClinicIdParamPipe();

  it("accepts ordinary clinic ids and rejects unsafe or oversized ones", () => {
    expect(pipe.transform("clinic-a_1")).toBe("clinic-a_1");
    expect(() => pipe.transform("a/b")).toThrow(HttpException);
    expect(() => pipe.transform("x".repeat(65))).toThrow(HttpException);
    expect(() => pipe.transform("")).toThrow(HttpException);
  });
});

describe("every identifier route validates its path parameter", () => {
  it("audit, staff and invitation routes use a UUID pipe", () => {
    const routes: [object, string, string][] = [
      [AuditController, "verify", "auditId"],
      [StaffController, "updateRole", "staffId"],
      [InvitationController, "revoke", "invitationId"],
    ];
    for (const [controller, handler, param] of routes) {
      const pipes = pipesFor(controller, handler, param);
      expect(pipes.some((p) => p instanceof ParseUUIDPipe), `${handler}`).toBe(true);
    }
  });

  it.each(["get", "update", "archive"])("ClinicController.%s uses the clinic id pipe", (handler) => {
    const pipes = pipesFor(ClinicController, handler, "clinicId");
    expect(pipes.some((p) => p instanceof ClinicIdParamPipe)).toBe(true);
  });
});
