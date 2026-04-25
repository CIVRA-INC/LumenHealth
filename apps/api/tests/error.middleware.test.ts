import { describe, expect, it, vi } from "vitest";
import { NextFunction, Request, Response } from "express";
import { unauthorizedProblem } from "../src/core/problem";
import { errorMiddleware } from "../src/middlewares/error.middleware";

const createResponse = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };

  return res as unknown as Response;
};

describe("error middleware", () => {
  it("formats known api problems with correlation id", () => {
    const req = {
      context: {
        correlationId: "corr-001",
      },
    } as Request;
    const res = createResponse();
    const next = vi.fn() as unknown as NextFunction;

    errorMiddleware(unauthorizedProblem(), req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
        correlationId: "corr-001",
      },
    });
  });

  it("hides internal error details", () => {
    const req = {
      context: {
        correlationId: "corr-002",
      },
    } as Request;
    const res = createResponse();
    const next = vi.fn() as unknown as NextFunction;

    errorMiddleware(new Error("db exploded"), req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
        correlationId: "corr-002",
      },
    });
  });
});
