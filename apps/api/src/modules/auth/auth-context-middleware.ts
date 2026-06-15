import type { NextFunction, Request, Response } from "express";
import { sessionStore } from "./session-store.js";
import { unauthorized } from "./response-helpers.js";

export type AuthContext = {
  userId: string;
  clinicId: string;
  role: "owner";
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
  req.auth = {
    userId: session.userId,
    clinicId: session.clinicId,
    role: "owner",
    accessToken: session.accessToken,
  };
  next();
}
