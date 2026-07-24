import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { serverConfig } from "@lumen/config";
import type { SignedPayload } from "./signing.js";

export type GetMerkleRootForTx = (txHash: string) => Promise<string | null>;
export type SignPayload = (payload: string) => SignedPayload;

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
