import type { Request, Response } from "express";
import type { SendInvitationRequest, AcceptInvitationRequest, InvitationStatus } from "@lumen/types";
import { validateSendInvitation, validateAcceptInvitation } from "../validators/invitation.validator.js";
import { sendInvitation, acceptInvitation, revokeInvitation } from "../services/invitation.service.js";
import { invitationStore } from "../repositories/invitation.repository.js";

export function send(req: Request, res: Response): void {
  const role = req.auth!.role;
  if (role !== "owner" && role !== "admin") {
    res.status(403).json({ error: "AUTH_FORBIDDEN", message: "only owner or admin can send invitations" });
    return;
  }

  const validation = validateSendInvitation(req.body);
  if (!validation.ok) {
    res.status(400).json({ error: "INVITATION_INVALID_INPUT", message: validation.message, field: validation.field });
    return;
  }

  const body = req.body as SendInvitationRequest;
  const result = sendInvitation(body, req.auth!.clinicId, req.auth!.userId);

  if ("error" in result) {
    const status = result.error === "INVITATION_ALREADY_PENDING" || result.error === "STAFF_ALREADY_EXISTS" ? 409 : 400;
    res.status(status).json(result);
    return;
  }

  res.status(201).json(result);
}

export async function accept(req: Request, res: Response): Promise<void> {
  const validation = validateAcceptInvitation(req.body);
  if (!validation.ok) {
    res.status(400).json({ error: "INVITATION_INVALID_INPUT", message: validation.message, field: validation.field });
    return;
  }

  const { token, password, name } = req.body as AcceptInvitationRequest;
  const result = await acceptInvitation(token, password, name);

  if ("error" in result) {
    const status =
      result.error === "INVITATION_NOT_FOUND" ? 404 :
      result.error === "INVITATION_EXPIRED" ? 410 :
      409;
    res.status(status).json(result);
    return;
  }

  res.status(201).json(result);
}

export function list(req: Request, res: Response): void {
  const role = req.auth!.role;
  if (role !== "owner" && role !== "admin") {
    res.status(403).json({ error: "AUTH_FORBIDDEN", message: "only owner or admin can list invitations" });
    return;
  }

  const statusFilter = req.query.status as InvitationStatus | undefined;
  const invitations = invitationStore.listByClinic(req.auth!.clinicId, statusFilter ? { status: statusFilter } : undefined);
  res.json({ invitations });
}

export function revoke(req: Request, res: Response): void {
  const role = req.auth!.role;
  if (role !== "owner" && role !== "admin") {
    res.status(403).json({ error: "AUTH_FORBIDDEN", message: "only owner or admin can revoke invitations" });
    return;
  }

  const result = revokeInvitation(String(req.params.invitationId), req.auth!.clinicId);

  if ("error" in result) {
    const status = result.error === "INVITATION_NOT_FOUND" ? 404 : 400;
    res.status(status).json(result);
    return;
  }

  res.json(result);
}
