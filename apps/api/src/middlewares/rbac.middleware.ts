import { RequestHandler } from "express";
import { forbiddenProblem, unauthorizedProblem } from "../core/problem";
import { getRequestContext } from "./request-context.middleware";

export enum Roles {
  SUPER_ADMIN = "SUPER_ADMIN",
  CLINIC_ADMIN = "CLINIC_ADMIN",
  DOCTOR = "DOCTOR",
  NURSE = "NURSE",
  ASSISTANT = "ASSISTANT",
  READ_ONLY = "READ_ONLY",
}

const ROLE_SET = new Set(Object.values(Roles));

export const authorize = (allowedRoles: Roles[]): RequestHandler => {
  return (req, res, next) => {
    getRequestContext(req);

    if (!req.user) {
      return next(unauthorizedProblem());
    }

    if (!ROLE_SET.has(req.user.role as Roles)) {
      return next(unauthorizedProblem('Invalid or expired token'));
    }

    if (!allowedRoles.includes(req.user.role as Roles)) {
      return next(forbiddenProblem());
    }

    return next();
  };
};
