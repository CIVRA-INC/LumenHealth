import { Controller, Get, Res, UseGuards, Query, HttpException, HttpStatus, Post, Body, Param, Ip } from '@nestjs/common';
import type { Response } from "express";
import type { AuditAction, AuditExportBundle } from "@lumen/types";
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import { PermissionsGuard } from '../../../shared/guards/permissions.guard.js';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator.js';
import { AuthContext } from '../../../shared/decorators/auth-context.decorator.js';
import type { AuthContextType } from '../../../shared/types/auth-context.js';
import { AuditService } from "../services/audit.service.js";
import {
  AnchoringNotConfiguredError,
  InvalidExportBundleError,
  StellarVerifierClient,
} from "../services/stellar-verifier.client.js";
import {
  VerificationBudgetExceededError,
  verifyExportProtection,
  withTimeBudget,
} from "../services/verify-export.protection.js";

@Controller('audit')
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly stellarVerifierClient: StellarVerifierClient
  ) {}

  @Get()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('staff:write')
  list(@Query() query: Record<string, unknown>, @AuthContext() auth: AuthContextType, @Res() res: Response) {
    const role = auth.role;
    if (role !== "owner" && role !== "admin") {
      throw new HttpException({ error: "AUTH_FORBIDDEN", message: "only owner or admin can view audit logs" }, HttpStatus.FORBIDDEN);
    }

    const clinicId = auth.clinicId;
    const { action, actorId, targetId, from, to, page, limit } = query;

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
  async exportAuditLog(@Query() query: Record<string, unknown>, @AuthContext() auth: AuthContextType, @Res() res: Response) {
    const role = auth.role;
    if (role !== "owner" && role !== "admin") {
      throw new HttpException({ error: "AUTH_FORBIDDEN", message: "only owner or admin can export audit logs" }, HttpStatus.FORBIDDEN);
    }

    const clinicId = auth.clinicId;
    const { from, to } = query;

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
  async anchoringHealth(@AuthContext() auth: AuthContextType, @Res() res: Response) {
    const role = auth.role;
    if (role !== "owner" && role !== "admin") {
      throw new HttpException({ error: "AUTH_FORBIDDEN", message: "only owner or admin can view anchoring health" }, HttpStatus.FORBIDDEN);
    }

    try {
      const health = await this.stellarVerifierClient.fetchAnchoringHealth();
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
  async verify(@Param('auditId') auditId: string, @AuthContext() auth: AuthContextType, @Res() res: Response) {
    const role = auth.role;
    if (role !== "owner" && role !== "admin") {
      throw new HttpException({ error: "AUTH_FORBIDDEN", message: "only owner or admin can verify audit logs" }, HttpStatus.FORBIDDEN);
    }

    const clinicId = auth.clinicId;

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
  async verifyExport(@Body('bundle') bundle: unknown, @Ip() ip: string, @Res() res: Response) {
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

    // Abuse protection (#1336): rate limit first — the cheapest gate — then
    // shape, then the per-request work plan (distinct-transaction cap bounds
    // the Horizon lookups stellar-service can be asked for), then the global
    // concurrency gate and the wall-clock budget.
    const rate = verifyExportProtection.checkRate(ip ?? "unknown");
    if (!rate.allowed) {
      throw new HttpException(
        {
          error: "RATE_LIMITED",
          message: `too many verify-export requests; retry in ${Math.max(Math.ceil(rate.retryAfterMs / 1000), 1)}s`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!isPlausibleExportBundle(bundle)) {
      throw new HttpException({
        error: "INVALID_BODY",
        message: "bundle must be a well-formed AuditExportBundle (manifest, signature, signingPublicKey, entries)",
      }, HttpStatus.BAD_REQUEST);
    }

    const plan = verifyExportProtection.plan(bundle);
    if (!plan.allowed) {
      throw new HttpException(
        { error: "EXPORT_TOO_LARGE", message: plan.reason },
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }

    if (!verifyExportProtection.concurrency.tryAcquire()) {
      throw new HttpException(
        {
          error: "VERIFICATION_BUSY",
          message: `too many concurrent verifications in flight (${verifyExportProtection.config.maxConcurrentVerifications}); retry shortly`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    try {
      const report = await withTimeBudget(
        this.stellarVerifierClient.verifyExportBundleRemote(bundle),
        verifyExportProtection.config.timeBudgetMs,
      );
      // Successful verification warms the root cache: repeat hashes across
      // requests become zero-Horizon-lookup cache hits.
      verifyExportProtection.remember(bundle);
      return res.json(report);
    } catch (error) {
      if (error instanceof VerificationBudgetExceededError) {
        throw new HttpException(
          { error: "VERIFICATION_BUDGET_EXCEEDED", message: error.message },
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }
      if (error instanceof InvalidExportBundleError) {
        throw new HttpException({ error: "INVALID_BODY", message: error.message }, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException({
        error: "STELLAR_SERVICE_UNAVAILABLE",
        message: error instanceof Error ? error.message : "failed to reach stellar-service",
      }, HttpStatus.BAD_GATEWAY);
    } finally {
      verifyExportProtection.concurrency.release();
    }
  }
}
