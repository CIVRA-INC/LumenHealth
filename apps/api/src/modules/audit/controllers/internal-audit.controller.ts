import { Controller, Get, Post, Body, Req, Res, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { BatchAnchorResult } from '@lumen/types';
import { AuditService } from '../services/audit.service.js';
import { InternalServiceTokenGuard } from '../guards/internal-service-token.guard.js';

@Controller('internal/audit')
@UseGuards(InternalServiceTokenGuard)
export class InternalAuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('unanchored')
  listUnanchored(@Req() _req: Request, @Res() res: Response) {
    return res.json({ entries: this.auditService.getUnanchoredEntries() });
  }

  @Post('anchor-result')
  submitAnchorResult(@Body() body: Partial<BatchAnchorResult>, @Req() req: Request, @Res() res: Response) {
    if (
      typeof body.merkleRoot !== "string" ||
      typeof body.stellarTxHash !== "string" ||
      typeof body.anchoredAt !== "string" ||
      !Array.isArray(body.entries)
    ) {
      throw new HttpException({ error: "INVALID_BODY", message: "malformed batch anchor result" }, HttpStatus.BAD_REQUEST);
    }

    const updated = this.auditService.applyBatchAnchorResult(body as BatchAnchorResult);
    return res.json({ updated: updated.length });
  }
}
