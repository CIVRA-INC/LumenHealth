import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { serverConfig } from "@lumen/config";
import type { AuditExportBundle, SigningKeyRecord } from "@lumen/types";
import type { SignedPayload } from "./signing.js";
import { verifyExportBundle } from "./verify-export.js";

export type GetMerkleRootForTx = (txHash: string) => Promise<string | null>;
export type SignPayload = (payload: string) => SignedPayload;

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
  /** Server-controlled, not client-supplied — a caller-provided registry could just claim any key is authorized. */
  signingKeyRegistry?: SigningKeyRecord[],
): Express {
  const app = express();
  app.use(express.json());
  app.use(requireInternalServiceToken);

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
