import { describe, expect, it } from "vitest";
import "reflect-metadata";
import { NoStoreInterceptor } from "../../../common/interceptors/no-store.interceptor.js";
import { AuditController } from "../controllers/audit.controller.js";

const INTERCEPTORS = "__interceptors__";
const interceptorsOf = (method: keyof AuditController): unknown[] =>
  Reflect.getMetadata(INTERCEPTORS, AuditController.prototype[method]) ?? [];

describe("audit controller cache headers", () => {
  it.each(["list", "exportAuditLog", "verify", "anchoringHealth"] as const)("%s sends no-store headers", (method) => {
    expect(interceptorsOf(method)).toContain(NoStoreInterceptor);
  });

  it("leaves the public verify-export route cacheable", () => {
    expect(interceptorsOf("verifyExport")).not.toContain(NoStoreInterceptor);
  });
});
