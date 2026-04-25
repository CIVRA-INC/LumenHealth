import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextFunction, Request, Response } from "express";
import { authorize, Roles } from "../src/middlewares/rbac.middleware";
import { ApiProblem } from "../src/core/problem";

const createResponse = (): Response => ({}) as Response;

const createRequest = (overrides: Partial<Request> = {}) =>
  ({
    context: {
      correlationId: "corr-123",
      actor: null,
      clinicId: null,
      request: {
        method: "GET",
        path: "/api/v1/test",
      },
      subscription: {
        status: "unknown",
      },
    },
    ...overrides,
  }) as Request;

describe("authorize middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("grants access and attaches req.user when role is allowed", () => {
    const middleware = authorize([Roles.CLINIC_ADMIN, Roles.DOCTOR]);

    const req = createRequest({
      user: {
        userId: "user-1",
        role: "CLINIC_ADMIN",
        clinicId: "clinic-1",
      },
    });
    const res = createResponse();
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(req.user).toEqual({
      userId: "user-1",
      role: "CLINIC_ADMIN",
      clinicId: "clinic-1",
    });
    expect(next).toHaveBeenCalledOnce();
  });

  it("returns 403 for authenticated user without required role", () => {
    const middleware = authorize([Roles.SUPER_ADMIN]);

    const req = createRequest({
      user: {
        userId: "user-2",
        role: "NURSE",
        clinicId: "clinic-1",
      },
    });
    const res = createResponse();
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiProblem));
    const problem = vi.mocked(next).mock.calls[0][0] as ApiProblem;
    expect(problem.statusCode).toBe(403);
    expect(problem.code).toBe("FORBIDDEN");
  });

  it("returns 401 when token is missing", () => {
    const middleware = authorize([Roles.CLINIC_ADMIN]);

    const req = createRequest();
    const res = createResponse();
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiProblem));
    const problem = vi.mocked(next).mock.calls[0][0] as ApiProblem;
    expect(problem.statusCode).toBe(401);
    expect(problem.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 when token is invalid", () => {
    const middleware = authorize([Roles.CLINIC_ADMIN]);

    const req = createRequest({
      user: {
        userId: "user-3",
        role: "INVALID_ROLE" as Roles,
        clinicId: "clinic-1",
      },
    });
    const res = createResponse();
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiProblem));
    const problem = vi.mocked(next).mock.calls[0][0] as ApiProblem;
    expect(problem.statusCode).toBe(401);
    expect(problem.message).toBe("Invalid or expired token");
  });
});
