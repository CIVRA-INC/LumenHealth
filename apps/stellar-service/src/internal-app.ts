import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { serverConfig } from "@lumen/config";

export type GetMerkleRootForTx = (txHash: string) => Promise<string | null>;

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
export function createInternalApp(getMerkleRootForTx: GetMerkleRootForTx): Express {
  const app = express();
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

  return app;
}
