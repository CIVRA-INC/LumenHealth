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

/** Default and maximum page size for the unanchored listing (issue #1028). */
const DEFAULT_UNANCHORED_LIMIT = 1000;
const MAX_UNANCHORED_LIMIT = 1000;

/**
 * Max entries a single anchor-result submission may carry (issue #1028). Since
 * listUnanchored pages at MAX_UNANCHORED_LIMIT (1000), a well-behaved batch
 * anchors at most that many, so 2000 leaves headroom while still bounding the
 * array well below Express's body-size limit.
 */
const MAX_ANCHOR_RESULT_ENTRIES = 2000;

export function listUnanchored(req: Request, res: Response): void {
  // Paginate so a large unanchored backlog (e.g. after an anchoring outage)
  // can't return an unbounded payload across the service boundary. Consumers
  // that need the whole queue page through it; the anchoring job naturally
  // drains it over successive cycles.
  const all = getUnanchoredEntries();
  const page = Math.max(1, Number(req.query.page) || 1);
  const requestedLimit = Number(req.query.limit) || DEFAULT_UNANCHORED_LIMIT;
  const limit = Math.min(Math.max(1, requestedLimit), MAX_UNANCHORED_LIMIT);
  const offset = (page - 1) * limit;
  const entries = all.slice(offset, offset + limit);

  res.json({ entries, total: all.length, page, limit });
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

  if (body.entries.length > MAX_ANCHOR_RESULT_ENTRIES) {
    res.status(413).json({
      error: "PAYLOAD_TOO_LARGE",
      message: `anchor result may not exceed ${MAX_ANCHOR_RESULT_ENTRIES} entries`,
    });
    return;
  }

  const updated = applyBatchAnchorResult(body as BatchAnchorResult);
  res.json({ updated: updated.length });
}
