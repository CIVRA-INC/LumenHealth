import { ErrorRequestHandler, Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

/** Canonical error envelope returned by every API controller. */
export interface ApiErrorShape {
  error: string;
  message: string;
  statusCode: number;
  issues?: { field: string; message: string }[];
}

/** Typed error that controllers can throw to set status + code explicitly. */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

function normalize(err: unknown, res: Response): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      statusCode: err.statusCode,
    } satisfies ApiErrorShape);
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: "ValidationError",
      message: "Request validation failed",
      statusCode: 400,
      issues: err.issues.map((i) => ({
        field: i.path.join(".") || "root",
        message: i.message,
      })),
    } satisfies ApiErrorShape);
    return;
  }

  // Unknown / unhandled – never leak internals
  res.status(500).json({
    error: "InternalServerError",
    message: "An unexpected error occurred",
    statusCode: 500,
  } satisfies ApiErrorShape);
}

/** Express error-handling middleware – mount last in app.ts */
export const errorNormalizer: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  normalize(err, res);
};
