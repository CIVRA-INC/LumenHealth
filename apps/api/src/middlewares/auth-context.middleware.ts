import { RequestHandler } from "express";
import { z } from "zod";
import { AppRole } from "../types/express";
import { verifyAccessToken } from "../modules/auth/token.service";

const roleSchema = z.enum([
  "SUPER_ADMIN",
  "CLINIC_ADMIN",
  "DOCTOR",
  "NURSE",
  "ASSISTANT",
  "READ_ONLY",
]);

const getUserFromHeaders = (headers: Record<string, unknown>) => {
  const userId = headers["x-user-id"];
  const role = headers["x-user-role"];
  const clinicId = headers["x-clinic-id"];

  const result = z
    .object({
      userId: z.string().min(1),
      role: roleSchema,
      clinicId: z.string().min(1),
    })
    .safeParse({ userId, role, clinicId });

  return result.success ? result.data : null;
};

const getTokenFromAuthorizationHeader = (
  authorization: unknown,
): string | null => {
  if (typeof authorization !== "string") {
    return null;
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
};

export const requireAuthenticatedUser: RequestHandler = (req, res, next) => {
  if (!req.user) {
    const bearerToken = getTokenFromAuthorizationHeader(req.headers.authorization);
    if (bearerToken) {
      const tokenUser = verifyAccessToken(bearerToken);
      if (tokenUser) {
        req.user = tokenUser;
      }
    }
  }

  if (!req.user) {
    const headerUser = getUserFromHeaders(req.headers as Record<string, unknown>);
    if (headerUser) {
      req.user = headerUser;
    }
  }

  if (!req.user) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Authentication required",
    });
  }

  next();
};

export const requireRole = (allowedRoles: AppRole[]): RequestHandler => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Insufficient permissions",
      });
    }

    next();
  };
};
