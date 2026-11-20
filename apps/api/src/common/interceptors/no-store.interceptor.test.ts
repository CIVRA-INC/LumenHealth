import { describe, expect, it, vi } from "vitest";
import type { CallHandler, ExecutionContext } from "@nestjs/common";
import { of } from "rxjs";
import { NoStoreInterceptor } from "./no-store.interceptor.js";

describe("NoStoreInterceptor", () => {
  it("sets the no-store headers before the handler runs and leaves the body alone", async () => {
    const setHeader = vi.fn();
    const context = { switchToHttp: () => ({ getResponse: () => ({ setHeader }) }) } as unknown as ExecutionContext;
    const handle = vi.fn(() => of({ ok: true }));

    const result = new NoStoreInterceptor().intercept(context, { handle } as CallHandler);

    expect(setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
    expect(setHeader).toHaveBeenCalledWith("Pragma", "no-cache");
    expect(setHeader).toHaveBeenCalledWith("X-Content-Type-Options", "nosniff");
    expect(setHeader.mock.invocationCallOrder[0]).toBeLessThan(handle.mock.invocationCallOrder[0]);
    await expect(new Promise((resolve) => result.subscribe(resolve))).resolves.toEqual({ ok: true });
  });
});
