import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { serverConfig } from "@lumen/config";
import type { AnchoringHealthReport, AuditExportBundle, BatchAnchorResult, SigningKeyRecord } from "@lumen/types";
import type { SignedPayload } from "./signing.js";
import { verifyExportBundle } from "./verify-export.js";
import type { UnanchoredEntry } from "./anchoring.js";

export type GetMerkleRootForTx = (txHash: string) => Promise<string | null>;
export type SignPayload = (payload: string) => SignedPayload;
export type AnchorImmediate = (entries: UnanchoredEntry[]) => Promise<BatchAnchorResult>;
export type GetAnchoringHealth = () => Promise<AnchoringHealthReport>;

function isPlausibleUnanchoredEntries(value: unknown): value is UnanchoredEntry[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (e) =>
        e &&
        typeof e === "object" &&
        typeof (e as Partial<UnanchoredEntry>).auditId === "string" &&
        typeof (e as Partial<UnanchoredEntry>).sha256Hash === "string" &&
        typeof (e as Partial<UnanchoredEntry>).createdAt === "string",
    )
  );
}

/**
 * Minimal shape check for an uploaded export bundle — enough to reject
 * garbage before it reaches `verifyExportBundle`, not a full schema
 * validation. `verifyExportBundle` itself is what actually determines
 * whether the *contents* are trustworthy.
 */
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

function requireInternalServiceToken(req: Request, res: Response, next: NextFunction): void {
  const token = req.header("x-internal-service-token");
  if (!token || token !== serverConfig.internalServiceToken) {
    res.status(401).json({ error: "UNAUTHORIZED", message: "invalid or missing internal service token" });
    return;
  }
  next();
}

/**
 * Builds the internal HTTP app apps/api calls to look up the Merkle root
 * that was actually anchored on-chain for a given transaction. Kept as a
 * factory (rather than a module-level singleton) so tests can inject a
 * fake `getMerkleRootForTx` instead of hitting real Horizon.
 */
export function createInternalApp(
  getMerkleRootForTx: GetMerkleRootForTx,
  signPayload: SignPayload,
  /** Optional — omitted in contexts (e.g. some tests) that don't run the anchoring service in-process. */
  anchorImmediate?: AnchorImmediate,
  /** Optional — omitted in contexts that don't run the anchoring scheduler in-process. */
  getAnchoringHealth?: GetAnchoringHealth,
  /** Server-controlled, not client-supplied — a caller-provided registry could just claim any key is authorized. */
  signingKeyRegistry?: SigningKeyRecord[],
): Express {
  const app = express();
  app.use(express.json());
  app.use(requireInternalServiceToken);

  app.post("/internal/anchor-immediate", async (req: Request, res: Response) => {
    if (!anchorImmediate) {
      res.status(501).json({
        error: "NOT_CONFIGURED",
        message: "this process doesn't run the anchoring service",
      });
      return;
    }

    const { entries } = req.body as { entries?: unknown };
    if (!isPlausibleUnanchoredEntries(entries)) {
      res.status(400).json({
        error: "INVALID_BODY",
        message: "entries must be a non-empty array of {auditId, sha256Hash, createdAt}",
      });
      return;
    }

    try {
      const result = await anchorImmediate(entries);
      res.json(result);
    } catch (error) {
      res.status(502).json({
        error: "HORIZON_ERROR",
        message: error instanceof Error ? error.message : "failed to anchor entries immediately",
      });
    }
  });

  app.get("/internal/anchoring/health", async (_req: Request, res: Response) => {
    if (!getAnchoringHealth) {
      res.status(501).json({
        error: "NOT_CONFIGURED",
        message: "this process doesn't run the anchoring scheduler",
      });
      return;
    }

    try {
      const health = await getAnchoringHealth();
      res.json(health);
    } catch (error) {
      res.status(502).json({
        error: "HEALTH_CHECK_FAILED",
        message: error instanceof Error ? error.message : "failed to compute anchoring health",
      });
    }
  });

  app.get("/internal/tx/:txHash/merkle-root", async (req: Request, res: Response) => {
    try {
      const merkleRoot = await getMerkleRootForTx(String(req.params.txHash));
      if (merkleRoot === null) {
        res.status(404).json({ error: "NOT_FOUND", message: "no merkle root found for that transaction" });
        return;
      }
      res.json({ merkleRoot });
    } catch (error) {
      res.status(502).json({
        error: "HORIZON_ERROR",
        message: error instanceof Error ? error.message : "failed to reach Horizon",
      });
    }
  });

  app.post("/internal/verify-export", async (req: Request, res: Response) => {
    const { bundle } = req.body as { bundle?: unknown };
    if (!isPlausibleExportBundle(bundle)) {
      res.status(400).json({
        error: "INVALID_BODY",
        message: "bundle must be a well-formed AuditExportBundle (manifest, signature, signingPublicKey, entries)",
      });
      return;
    }

    try {
      const report = await verifyExportBundle(bundle, getMerkleRootForTx, signingKeyRegistry);
      res.json(report);
    } catch (error) {
      res.status(502).json({
        error: "HORIZON_ERROR",
        message: error instanceof Error ? error.message : "failed to verify export against Stellar",
      });
    }
  });

  app.post("/internal/sign", (req: Request, res: Response) => {
    const { payload } = req.body as { payload?: unknown };
    if (typeof payload !== "string" || payload.length === 0) {
      res.status(400).json({ error: "INVALID_BODY", message: "payload must be a non-empty string" });
      return;
    }

    try {
      const signed = signPayload(payload);
      res.json(signed);
    } catch (error) {
      res.status(500).json({
        error: "SIGNING_ERROR",
        message: error instanceof Error ? error.message : "failed to sign payload",
      });
    }
  });

  return app;
}
