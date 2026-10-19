import { Controller, Get, Post, Body, Headers, Req, Res, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { BatchAnchorResult } from '@lumen/types';
import { AuditService } from '../services/audit.service.js';
import { idempotencyStore } from '../services/idempotency.store.js';
import { InternalRequestAuthGuard } from '../guards/internal-request-auth.guard.js';

@Controller('internal/audit')
@UseGuards(InternalRequestAuthGuard)
export class InternalAuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('unanchored')
  listUnanchored(@Req() _req: Request, @Res() res: Response) {
    return res.json({ entries: this.auditService.getUnanchoredEntries() });
  }

  @Post('anchor-result')
  submitAnchorResult(
    @Body() body: Partial<BatchAnchorResult>,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (
      typeof body.merkleRoot !== "string" ||
      typeof body.stellarTxHash !== "string" ||
      typeof body.anchoredAt !== "string" ||
      !Array.isArray(body.entries)
    ) {
      throw new HttpException({ error: "INVALID_BODY", message: "malformed batch anchor result" }, HttpStatus.BAD_REQUEST);
    }

    const key = idempotencyKey ?? body.stellarTxHash;
    const replay = idempotencyStore.get(key);
    if (replay) return res.json(replay);

    const updated = this.auditService.applyBatchAnchorResult(body as BatchAnchorResult);
    const response = { updated: updated.length };
    idempotencyStore.set(key, response);
    return res.json(response);
  }
}
