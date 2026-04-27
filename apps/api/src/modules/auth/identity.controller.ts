/**
 * Identity & Sessions – API contracts and handlers (closes #409)
 *
 * Thin controller: validates input, delegates to the service layer,
 * and returns problem-consistent responses.
 */

import { Router, Request, Response, NextFunction } from "express";
import { body, param, validationResult } from "express-validator";
import { AppRole } from "../../../types/express";
import {
  createIdentity,
  transitionIdentityStatus,
  openSession,
  revokeSession,
  listActiveSessions,
} from "./identity.service";

export const identityRouter = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validate(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: "VALIDATION_ERROR", details: errors.array() });
    return false;
  }
  return true;
}

function handle(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);
}

// ---------------------------------------------------------------------------
// Identity routes
// ---------------------------------------------------------------------------

identityRouter.post(
  "/identities",
  body("email").isEmail(),
  body("role").isString().notEmpty(),
  handle(async (req, res) => {
    if (!validate(req, res)) return;
    const actor = (req as any).user;
    const identity = await createIdentity({
      clinicId: actor.clinicId,
      email:    req.body.email,
      role:     req.body.role as AppRole,
      actorId:  actor.userId,
    });
    res.status(201).json(identity);
  }),
);

identityRouter.patch(
  "/identities/:id/status",
  param("id").isMongoId(),
  body("status").isIn(["ACTIVE", "SUSPENDED", "DEACTIVATED"]),
  handle(async (req, res) => {
    if (!validate(req, res)) return;
    const actor = (req as any).user;
    const updated = await transitionIdentityStatus(req.params.id, req.body.status, actor.userId);
    res.json(updated);
  }),
);

// ---------------------------------------------------------------------------
// Session routes
// ---------------------------------------------------------------------------

identityRouter.post(
  "/identities/:id/sessions",
  param("id").isMongoId(),
  handle(async (req, res) => {
    if (!validate(req, res)) return;
    const actor = (req as any).user;
    const session = await openSession(req.params.id, actor.clinicId);
    res.status(201).json(session);
  }),
);

identityRouter.get(
  "/identities/:id/sessions",
  param("id").isMongoId(),
  handle(async (req, res) => {
    if (!validate(req, res)) return;
    const sessions = await listActiveSessions(req.params.id);
    res.json(sessions);
  }),
);

identityRouter.delete(
  "/sessions/:id",
  param("id").isMongoId(),
  handle(async (req, res) => {
    if (!validate(req, res)) return;
    await revokeSession(req.params.id);
    res.status(204).send();
  }),
);
