import { Controller, Get, Req, Res, UseGuards, Query, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from "express";
import type { AuditAction, AuditExportBundle } from "@lumen/types";
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import { PermissionsGuard } from '../../../shared/guards/permissions.guard.js';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator.js';
import { buildAuditExport, queryAuditLog, verifyAuditEntry } from "../services/audit.service.js";
import {
  AnchoringNotConfiguredError,
  InvalidExportBundleError,
  fetchAnchoringHealth,
  verifyExportBundleRemote,
} from "../services/stellar-verifier.client.js";

@Controller('audit')
export class AuditController {

  @Get()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('clinic:read') // Wait, owners and admins only... Let me use 'auth:write' or whatever owner/admin shares that clinician lacks? Actually 'staff:write' is owner/admin only. Let's use 'staff:write' or just enforce owner/admin role explicitly. Wait, role-policies say owner/admin have `staff:write` but clinician doesn't. Or maybe `billing:write`. The original code checks `role !== "owner" && role !== "admin"`.
  list(@Req() req: Request, @Res() res: Response) {
    const role = req.auth!.role;
    if (role !== "owner" && role !== "admin") {
      throw new HttpException({ error: "AUTH_FORBIDDEN", message: "only owner or admin can view audit logs" }, HttpStatus.FORBIDDEN);
    }

    const clinicId = req.auth!.clinicId;
    const { action, actorId, targetId, from, to, page, limit } = req.query;

    const result = queryAuditLog({
      clinicId,
      action: action as AuditAction | undefined,
      actorId: actorId as string | undefined,
      targetId: targetId as string | undefined,
      from: from as string | undefined,
      to: to as string | undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    return res.json(result);
  }

  @Get('export')
  @UseGuards(AuthGuard)
  async exportAuditLog(@Req() req: Request, @Res() res: Response) {
    const role = req.auth!.role;
    if (role !== "owner" && role !== "admin") {
      throw new HttpException({ error: "AUTH_FORBIDDEN", message: "only owner or admin can export audit logs" }, HttpStatus.FORBIDDEN);
    }

    const clinicId = req.auth!.clinicId;
    const { from, to } = req.query;

    try {
      const bundle = await buildAuditExport(
        clinicId,
        from as string | undefined,
        to as string | undefined,
      );
      return res.json(bundle);
    } catch (error) {
      throw new HttpException({
        error: "STELLAR_SERVICE_UNAVAILABLE",
        message: error instanceof Error ? error.message : "failed to reach stellar-service",
      }, HttpStatus.BAD_GATEWAY);
    }
  }
}

function isPlausibleExportBundle(value: unknown): value is AuditExportBundle {
  if (!value || typeof value !== "object") return false;
  const b = value as Partial<AuditExportBundle>;
  return (
    typeof b.signature === "string" &&
    typeof b.signingPublicKey === "string" &&
    Array.isArray(b.entries) &&
    !!b.manifest &&
    typeof b.manifest === "object" &&
    typeof b.manifest.clinicId === "string" &&
    typeof b.manifest.entriesDigest === "string"
  );
}

export async function verifyExport(req: Request, res: Response): Promise<void> {
  const { bundle } = req.body as { bundle?: unknown };

  if (!isPlausibleExportBundle(bundle)) {
    res.status(400).json({
      error: "INVALID_BODY",
      message: "bundle must be a well-formed AuditExportBundle (manifest, signature, signingPublicKey, entries)",
    });
    return;
  }

  try {
    const report = await verifyExportBundleRemote(bundle);
    res.json(report);
  } catch (error) {
    if (error instanceof InvalidExportBundleError) {
      res.status(400).json({ error: "INVALID_BODY", message: error.message });
      return;
    }
    res.status(502).json({
      error: "STELLAR_SERVICE_UNAVAILABLE",
      message: error instanceof Error ? error.message : "failed to reach stellar-service",
    });
  }
}

export async function anchoringHealth(req: Request, res: Response): Promise<void> {
  const role = req.auth!.role;
  if (role !== "owner" && role !== "admin") {
    res.status(403).json({ error: "AUTH_FORBIDDEN", message: "only owner or admin can view anchoring health" });
    return;
  }

  try {
    const health = await fetchAnchoringHealth();
    res.json(health);
  } catch (error) {
    if (error instanceof AnchoringNotConfiguredError) {
      res.status(501).json({ error: "NOT_CONFIGURED", message: error.message });
      return;
    }
    res.status(502).json({
      error: "STELLAR_SERVICE_UNAVAILABLE",
      message: error instanceof Error ? error.message : "failed to reach stellar-service",
    });
  }
}

export async function verify(req: Request, res: Response): Promise<void> {
  const role = req.auth!.role;
  if (role !== "owner" && role !== "admin") {
    res.status(403).json({ error: "AUTH_FORBIDDEN", message: "only owner or admin can verify audit logs" });
    return;
  }

  const clinicId = req.auth!.clinicId;
  const auditId = req.params.auditId as string;

  try {
    const result = await verifyAuditEntry(clinicId, auditId);
    if (!result) {
      res.status(404).json({ error: "NOT_FOUND", message: "audit entry not found" });
      return;
    }
    res.json(result);
  } catch (error) {
    res.status(502).json({
      error: "STELLAR_SERVICE_UNAVAILABLE",
      message: error instanceof Error ? error.message : "failed to reach stellar-service",
    });
  }
}
