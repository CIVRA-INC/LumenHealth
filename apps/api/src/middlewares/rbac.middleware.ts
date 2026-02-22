import { RequestHandler } from "express";
import { verifyAccessToken } from "../modules/auth/token.service";

export enum Roles {
  SUPER_ADMIN = "SUPER_ADMIN",
  CLINIC_ADMIN = "CLINIC_ADMIN",
  DOCTOR = "DOCTOR",
  NURSE = "NURSE",
  ASSISTANT = "ASSISTANT",
  READ_ONLY = "READ_ONLY",
}

const ROLE_SET = new Set(Object.values(Roles));

const getBearerToken = (authorization: unknown): string | null => {
  if (typeof authorization !== "string") {
    return null;
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
};

export const authorize = (allowedRoles: Roles[]): RequestHandler => {
  return (req, res, next) => {
    const token = getBearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    const decodedUser = verifyAccessToken(token);
    if (!decodedUser || !ROLE_SET.has(decodedUser.role as Roles)) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid or expired token",
      });
    }

    req.user = decodedUser;

    if (!allowedRoles.includes(decodedUser.role as Roles)) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Insufficient permissions",
      });
    }

    return next();
  };
};
