import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextFunction, Request, Response } from "express";
import { authorize, Roles } from "../src/middlewares/rbac.middleware";
import { verifyAccessToken } from "../src/modules/auth/token.service";

vi.mock("../src/modules/auth/token.service", () => ({
  verifyAccessToken: vi.fn(),
}));

const mockedVerifyAccessToken = vi.mocked(verifyAccessToken);

const createResponse = (): Response => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };

  return res as unknown as Response;
};

describe("authorize middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("grants access and attaches req.user when role is allowed", () => {
    const middleware = authorize([Roles.CLINIC_ADMIN, Roles.DOCTOR]);

    mockedVerifyAccessToken.mockReturnValue({
      userId: "user-1",
      role: "CLINIC_ADMIN",
      clinicId: "clinic-1",
    });

    const req = {
      headers: { authorization: "Bearer valid-token" },
    } as Request;
    const res = createResponse();
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(mockedVerifyAccessToken).toHaveBeenCalledWith("valid-token");
    expect(req.user).toEqual({
      userId: "user-1",
      role: "CLINIC_ADMIN",
      clinicId: "clinic-1",
    });
    expect(next).toHaveBeenCalledOnce();
  });

  it("returns 403 for authenticated user without required role", () => {
    const middleware = authorize([Roles.SUPER_ADMIN]);

    mockedVerifyAccessToken.mockReturnValue({
      userId: "user-2",
      role: "NURSE",
      clinicId: "clinic-1",
    });

    const req = {
      headers: { authorization: "Bearer valid-token" },
    } as Request;
    const res = createResponse();
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: "Forbidden",
      message: "Insufficient permissions",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when token is missing", () => {
    const middleware = authorize([Roles.CLINIC_ADMIN]);

    const req = { headers: {} } as Request;
    const res = createResponse();
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Unauthorized",
      message: "Authentication required",
    });
    expect(mockedVerifyAccessToken).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when token is invalid", () => {
    const middleware = authorize([Roles.CLINIC_ADMIN]);

    mockedVerifyAccessToken.mockReturnValue(null);

    const req = {
      headers: { authorization: "Bearer bad-token" },
    } as Request;
    const res = createResponse();
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Unauthorized",
      message: "Invalid or expired token",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when decoded role is outside strict Roles enum", () => {
    const middleware = authorize([Roles.CLINIC_ADMIN]);

    mockedVerifyAccessToken.mockReturnValue({
      userId: "user-3",
      role: "INVALID_ROLE" as Roles,
      clinicId: "clinic-2",
    });

    const req = {
      headers: { authorization: "Bearer valid-token" },
    } as Request;
    const res = createResponse();
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
