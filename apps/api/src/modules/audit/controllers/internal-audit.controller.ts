import type { Request, Response } from "express";
import { serverConfig } from "@lumen/config";
import type { BatchAnchorResult } from "@lumen/types";
import { applyBatchAnchorResult, getUnanchoredEntries } from "../services/audit.service.js";

export function requireInternalServiceToken(req: Request, res: Response, next: () => void): void {
  const token = req.header("x-internal-service-token");
  if (!token || token !== serverConfig.internalServiceToken) {
    res.status(401).json({ error: "UNAUTHORIZED", message: "invalid or missing internal service token" });
    return;
  }
  next();
}

export function listUnanchored(_req: Request, res: Response): void {
  res.json({ entries: getUnanchoredEntries() });
}

export function submitAnchorResult(req: Request, res: Response): void {
  const body = req.body as Partial<BatchAnchorResult>;

  if (
    typeof body.merkleRoot !== "string" ||
    typeof body.stellarTxHash !== "string" ||
    typeof body.anchoredAt !== "string" ||
    !Array.isArray(body.entries)
  ) {
    res.status(400).json({ error: "INVALID_BODY", message: "malformed batch anchor result" });
    return;
  }

  const updated = applyBatchAnchorResult(body as BatchAnchorResult);
  res.json({ updated: updated.length });
}
