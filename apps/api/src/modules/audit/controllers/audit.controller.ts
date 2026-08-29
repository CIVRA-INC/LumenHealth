import type { Request, Response } from "express";
import type { AuditAction, AuditExportBundle } from "@lumen/types";
import { isAuditAction } from "@lumen/types";
import { AuditExportTooLargeError, buildAuditExport, queryAuditLog, verifyAuditEntry } from "../services/audit.service.js";

/** Returns the name of the first query param that arrived as a non-string (e.g. a repeated key parsed as an array), or undefined if all are single strings. */
function firstNonStringParam(params: Record<string, unknown>): string | undefined {
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined && typeof value !== "string") return name;
  }
  return undefined;
}

/**
 * Parses an optional pagination param: `undefined` when absent, the number
 * when it's a positive integer, or the literal `"invalid"` sentinel when it's
 * present but not a positive integer (so the caller can 400 instead of letting
 * a NaN through).
 */
function parsePositiveInt(value: unknown): number | undefined | "invalid" {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return "invalid";
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return "invalid";
  return n;
}
import {
  AnchoringNotConfiguredError,
  InvalidExportBundleError,
  fetchAnchoringHealth,
  verifyExportBundleRemote,
} from "../services/stellar-verifier.client.js";

export function list(req: Request, res: Response): void {
  const role = req.auth!.role;
  if (role !== "owner" && role !== "admin") {
    res.status(403).json({ error: "AUTH_FORBIDDEN", message: "only owner or admin can view audit logs" });
    return;
  }

  const clinicId = req.auth!.clinicId;
  const { action, actorId, targetId, from, to, page, limit } = req.query;

  // Query params arrive untyped from Express; a repeated key (?actorId=a&actorId=b)
  // even arrives as an array. Validate before casting so a malformed request gets
  // a clear 400 instead of silently matching nothing (or, for `action`, matching
  // no stored entry and returning a confusing empty page).
  const badParam = firstNonStringParam({ action, actorId, targetId, from, to });
  if (badParam) {
    res.status(400).json({ error: "INVALID_QUERY", message: `${badParam} must be a single string value` });
    return;
  }

  if (action !== undefined && !isAuditAction(action)) {
    res.status(400).json({ error: "INVALID_QUERY", message: "action is not a recognized audit action" });
    return;
  }

  // `?page=abc` would otherwise become NaN and slip past the repository's
  // `?? 1`/`?? 50` fallbacks, silently yielding an empty/incorrect page instead
  // of a clear 400 (see issue #1013).
  const pageNum = parsePositiveInt(page);
  if (pageNum === "invalid") {
    res.status(400).json({ error: "INVALID_QUERY", message: "page must be a positive integer" });
    return;
  }
  const limitNum = parsePositiveInt(limit);
  if (limitNum === "invalid") {
    res.status(400).json({ error: "INVALID_QUERY", message: "limit must be a positive integer" });
    return;
  }

  const result = queryAuditLog({
    clinicId,
    action: action as AuditAction | undefined,
    actorId: actorId as string | undefined,
    targetId: targetId as string | undefined,
    from: from as string | undefined,
    to: to as string | undefined,
    page: pageNum,
    limit: limitNum,
  });

  res.json(result);
}

export async function exportAuditLog(req: Request, res: Response): Promise<void> {
  const role = req.auth!.role;
  if (role !== "owner" && role !== "admin") {
    res.status(403).json({ error: "AUTH_FORBIDDEN", message: "only owner or admin can export audit logs" });
    return;
  }

  const clinicId = req.auth!.clinicId;
  const { from, to } = req.query;

  try {
    const bundle = await buildAuditExport(
      clinicId,
      from as string | undefined,
      to as string | undefined,
    );
    res.json(bundle);
  } catch (error) {
    if (error instanceof AuditExportTooLargeError) {
      res.status(413).json({ error: "EXPORT_TOO_LARGE", message: error.message });
      return;
    }
    res.status(502).json({
      error: "STELLAR_SERVICE_UNAVAILABLE",
      message: error instanceof Error ? error.message : "failed to reach stellar-service",
    });
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

/**
 * Public, unauthenticated: independently re-verifies a compliance export
 * bundle (see `exportAuditLog`) against live Stellar state. Deliberately
 * requires no LumenHealth account — a regulator, auditor, or partner
 * clinic holding an export file is exactly who this is for.
 */
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

/**
 * Owner/admin only: the anchoring *pipeline's* operational health — is the
 * scheduled batch job actually keeping up — as opposed to `verify`, which
 * reports on one specific audit entry.
 */
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
