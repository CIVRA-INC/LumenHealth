import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@lumen/types";
import { sessionStore } from "./session-store.js";
import { identityStore } from "./identity-store.js";
import { unauthorized } from "./response-helpers.js";

export type AuthContext = {
  userId: string;
  clinicId: string;
  role: UserRole;
  accessToken: string;
};

declare module "express-serve-static-core" {
  interface Request {
    auth?: AuthContext;
  }
}

export function resolveAuthContext(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return unauthorized(res, "missing bearer token");
  const accessToken = auth.slice("Bearer ".length);
  const session = sessionStore.findByAccessToken(accessToken);
  if (!session || !sessionStore.isValid(session.sessionId)) return unauthorized(res, "expired or invalid token");
  const identity = identityStore.findById(session.userId);
  req.auth = {
    userId: session.userId,
    clinicId: session.clinicId,
    role: identity?.role ?? "clinician",
    accessToken: session.accessToken,
  };
  next();
}
