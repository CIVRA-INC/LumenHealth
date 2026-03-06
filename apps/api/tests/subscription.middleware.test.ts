import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextFunction, Request, Response } from "express";
import { requireActiveSubscription } from "../src/middlewares/subscription.middleware";
import { ClinicModel } from "../src/modules/clinics/models/clinic.model";

vi.mock("../src/modules/auth/token.service", () => ({
  verifyAccessToken: vi.fn(),
}));

vi.mock("../src/modules/clinics/models/clinic.model", () => ({
  ClinicModel: {
    findById: vi.fn(),
  },
}));

const mockedFindById = vi.mocked(ClinicModel.findById);

const createResponse = (): Response => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };

  return res as unknown as Response;
};

describe("requireActiveSubscription middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows GET requests without subscription check", async () => {
    const req = {
      method: "GET",
      path: "/api/v1/users",
      headers: {},
    } as unknown as Request;
    const res = createResponse();
    const next = vi.fn() as unknown as NextFunction;

    await requireActiveSubscription(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(mockedFindById).not.toHaveBeenCalled();
  });

  it("skips checks for auth and billing write routes", async () => {
    const req = {
      method: "POST",
      path: "/api/v1/auth/login",
      headers: {},
      user: { userId: "u1", role: "CLINIC_ADMIN", clinicId: "c1" },
    } as unknown as Request;
    const res = createResponse();
    const next = vi.fn() as unknown as NextFunction;

    await requireActiveSubscription(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(mockedFindById).not.toHaveBeenCalled();
  });

  it("blocks mutating requests when clinic subscription is expired", async () => {
    const expiredDate = new Date(Date.now() - 60_000);
    mockedFindById.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ subscriptionExpiryDate: expiredDate }),
      }),
    } as never);

    const req = {
      method: "POST",
      path: "/api/v1/users",
      headers: {},
      user: { userId: "u1", role: "CLINIC_ADMIN", clinicId: "c1" },
    } as unknown as Request;
    const res = createResponse();
    const next = vi.fn() as unknown as NextFunction;

    await requireActiveSubscription(req, res, next);

    expect(res.status).toHaveBeenCalledWith(402);
    expect(res.json).toHaveBeenCalledWith({
      error: "PaymentRequired",
      message:
        "Subscription expired. Write access is disabled. Please renew billing to continue.",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("allows mutating requests when clinic subscription is active", async () => {
    const activeDate = new Date(Date.now() + 60_000);
    mockedFindById.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ subscriptionExpiryDate: activeDate }),
      }),
    } as never);

    const req = {
      method: "PATCH",
      path: "/api/v1/clinics/me",
      headers: {},
      user: { userId: "u1", role: "CLINIC_ADMIN", clinicId: "c1" },
    } as unknown as Request;
    const res = createResponse();
    const next = vi.fn() as unknown as NextFunction;

    await requireActiveSubscription(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});
