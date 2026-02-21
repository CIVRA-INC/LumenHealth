import { RequestHandler } from "express";
import { AppRole } from "../types/express";
import { verifyAccessToken } from "../modules/auth/token.service";

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
