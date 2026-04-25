import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextFunction, Request, Response } from "express";
import {
  buildCorrelationId,
  requestContextMiddleware,
} from "../src/middlewares/request-context.middleware";
import { verifyAccessToken } from "../src/modules/auth/token.service";

vi.mock("../src/modules/auth/token.service", () => ({
  verifyAccessToken: vi.fn(),
}));

const mockedVerifyAccessToken = vi.mocked(verifyAccessToken);

const createResponse = () =>
  ({
    setHeader: vi.fn(),
  }) as unknown as Response;

describe("request context middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the provided correlation id when present", () => {
    expect(buildCorrelationId("corr-123")).toBe("corr-123");
  });

  it("populates request context and decoded actor metadata", () => {
    mockedVerifyAccessToken.mockReturnValue({
      userId: "user-1",
      role: "CLINIC_ADMIN",
      clinicId: "clinic-1",
    });

    const req = {
      method: "POST",
      originalUrl: "/api/v1/patients",
      path: "/patients",
      headers: {
        authorization: "Bearer valid-token",
        "x-correlation-id": "corr-abc",
      },
    } as unknown as Request;
    const res = createResponse();
    const next = vi.fn() as unknown as NextFunction;

    requestContextMiddleware(req, res, next);

    expect(req.user).toEqual({
      userId: "user-1",
      role: "CLINIC_ADMIN",
      clinicId: "clinic-1",
    });
    expect(req.context).toEqual({
      correlationId: "corr-abc",
      actor: {
        userId: "user-1",
        role: "CLINIC_ADMIN",
      },
      clinicId: "clinic-1",
      request: {
        method: "POST",
        path: "/api/v1/patients",
      },
      subscription: {
        status: "unknown",
      },
    });
    expect(res.setHeader).toHaveBeenCalledWith("x-correlation-id", "corr-abc");
    expect(next).toHaveBeenCalledOnce();
  });

  it("creates anonymous context when no token is present", () => {
    const req = {
      method: "GET",
      originalUrl: "/health",
      path: "/health",
      headers: {},
    } as unknown as Request;
    const res = createResponse();
    const next = vi.fn() as unknown as NextFunction;

    requestContextMiddleware(req, res, next);

    expect(req.context?.actor).toBeNull();
    expect(req.context?.clinicId).toBeNull();
    expect(typeof req.context?.correlationId).toBe("string");
    expect(req.context?.correlationId.length).toBeGreaterThan(0);
    expect(next).toHaveBeenCalledOnce();
  });
});
