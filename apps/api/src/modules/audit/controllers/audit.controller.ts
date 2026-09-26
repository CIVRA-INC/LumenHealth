import { Controller, Get, Req, Res, UseGuards, Query, HttpException, HttpStatus, Post, Body, Param } from '@nestjs/common';
import type { Request, Response } from "express";
import type { AuditAction, AuditExportBundle } from "@lumen/types";
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import { PermissionsGuard } from '../../../shared/guards/permissions.guard.js';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator.js';
import { AuditService } from "../services/audit.service.js";
import {
  AnchoringNotConfiguredError,
  InvalidExportBundleError,
  fetchAnchoringHealth,
  verifyExportBundleRemote,
} from "../services/stellar-verifier.client.js";

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('staff:write')
  list(@Req() req: Request, @Res() res: Response) {
    const role = req.auth!.role;
    if (role !== "owner" && role !== "admin") {
      throw new HttpException({ error: "AUTH_FORBIDDEN", message: "only owner or admin can view audit logs" }, HttpStatus.FORBIDDEN);
    }

    const clinicId = req.auth!.clinicId;
    const { action, actorId, targetId, from, to, page, limit } = req.query;

    const result = this.auditService.queryAuditLog({
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
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('staff:write')
  async exportAuditLog(@Req() req: Request, @Res() res: Response) {
    const role = req.auth!.role;
    if (role !== "owner" && role !== "admin") {
      throw new HttpException({ error: "AUTH_FORBIDDEN", message: "only owner or admin can export audit logs" }, HttpStatus.FORBIDDEN);
    }

    const clinicId = req.auth!.clinicId;
    const { from, to } = req.query;

    try {
      const bundle = await this.auditService.buildAuditExport(
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

  @Get('anchoring-health')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('staff:write')
  async anchoringHealth(@Req() req: Request, @Res() res: Response) {
    const role = req.auth!.role;
    if (role !== "owner" && role !== "admin") {
      throw new HttpException({ error: "AUTH_FORBIDDEN", message: "only owner or admin can view anchoring health" }, HttpStatus.FORBIDDEN);
    }

    try {
      const health = await fetchAnchoringHealth();
      return res.json(health);
    } catch (error) {
      if (error instanceof AnchoringNotConfiguredError) {
        throw new HttpException({ error: "NOT_CONFIGURED", message: error.message }, HttpStatus.NOT_IMPLEMENTED);
      }
      throw new HttpException({
        error: "STELLAR_SERVICE_UNAVAILABLE",
        message: error instanceof Error ? error.message : "failed to reach stellar-service",
      }, HttpStatus.BAD_GATEWAY);
    }
  }

  @Get(':auditId/verify')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('staff:write')
  async verify(@Param('auditId') auditId: string, @Req() req: Request, @Res() res: Response) {
    const role = req.auth!.role;
    if (role !== "owner" && role !== "admin") {
      throw new HttpException({ error: "AUTH_FORBIDDEN", message: "only owner or admin can verify audit logs" }, HttpStatus.FORBIDDEN);
    }

    const clinicId = req.auth!.clinicId;

    try {
      const result = await this.auditService.verifyAuditEntry(clinicId, auditId);
      if (!result) {
        throw new HttpException({ error: "NOT_FOUND", message: "audit entry not found" }, HttpStatus.NOT_FOUND);
      }
      return res.json(result);
    } catch (error) {
      throw new HttpException({
        error: "STELLAR_SERVICE_UNAVAILABLE",
        message: error instanceof Error ? error.message : "failed to reach stellar-service",
      }, HttpStatus.BAD_GATEWAY);
    }
  }

  @Post('verify-export')
  async verifyExport(@Body('bundle') bundle: unknown, @Req() req: Request, @Res() res: Response) {
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

    if (!isPlausibleExportBundle(bundle)) {
      throw new HttpException({
        error: "INVALID_BODY",
        message: "bundle must be a well-formed AuditExportBundle (manifest, signature, signingPublicKey, entries)",
      }, HttpStatus.BAD_REQUEST);
    }

    try {
      const report = await verifyExportBundleRemote(bundle);
      return res.json(report);
    } catch (error) {
      if (error instanceof InvalidExportBundleError) {
        throw new HttpException({ error: "INVALID_BODY", message: error.message }, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException({
        error: "STELLAR_SERVICE_UNAVAILABLE",
        message: error instanceof Error ? error.message : "failed to reach stellar-service",
      }, HttpStatus.BAD_GATEWAY);
    }
  }
}
