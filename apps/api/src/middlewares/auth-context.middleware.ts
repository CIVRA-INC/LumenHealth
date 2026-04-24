import { RequestHandler } from "express";
import { forbiddenProblem, unauthorizedProblem } from "../core/problem";
import { AppRole } from "../types/express";
import { getRequestContext } from "./request-context.middleware";

export const requireAuthenticatedUser: RequestHandler = (req, res, next) => {
  getRequestContext(req);

  if (!req.user) {
    return next(unauthorizedProblem());
  }

  next();
};

export const requireRole = (allowedRoles: AppRole[]): RequestHandler => {
  return (req, res, next) => {
    getRequestContext(req);

    if (!req.user) {
      return next(unauthorizedProblem());
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(forbiddenProblem());
    }

    next();
  };
};
