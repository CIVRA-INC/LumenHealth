import { ErrorRequestHandler } from "express";

export const errorMiddleware: ErrorRequestHandler = (error, _req, res, _next) => {
  const statusCode =
    typeof (error as { statusCode?: unknown })?.statusCode === "number"
      ? ((error as { statusCode: number }).statusCode as number)
      : 500;

  const message =
    statusCode >= 500
      ? "An unexpected server error occurred"
      : typeof (error as { message?: unknown })?.message === "string"
        ? ((error as { message: string }).message as string)
        : "Request failed";

  if (statusCode >= 500) {
    console.error("[api:error]", error);
  }

  res.status(statusCode).json({
    error: statusCode >= 500 ? "InternalServerError" : "RequestError",
    message,
  });
};
