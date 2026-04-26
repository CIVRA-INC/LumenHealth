import { Request, Response, NextFunction } from "express";
import { AppRole } from "../../types/express";
import { forbiddenProblem, unauthorizedProblem } from "../../core/problem";
import { verifyAccessToken } from "./token.service";

export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(unauthorizedProblem("Missing or malformed Authorization header"));
  }

  const token = header.slice(7);
  const user = verifyAccessToken(token);
  if (!user) {
    return next(unauthorizedProblem("Invalid or expired access token"));
  }

  req.user = user;
  next();
};

export const requireRoles = (...roles: AppRole[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(unauthorizedProblem("Authentication required"));
    }
    if (!roles.includes(req.user.role)) {
      return next(forbiddenProblem("Insufficient role"));
    }
    next();
  };

export const requireOwnerOrRoles = (
  getResourceOwnerId: (req: Request) => string | undefined,
  ...roles: AppRole[]
) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(unauthorizedProblem("Authentication required"));
    }
    const isPrivileged = roles.includes(req.user.role);
    const isOwner = getResourceOwnerId(req) === req.user.userId;
    if (!isPrivileged && !isOwner) {
      return next(forbiddenProblem("Access denied"));
    }
    next();
  };
