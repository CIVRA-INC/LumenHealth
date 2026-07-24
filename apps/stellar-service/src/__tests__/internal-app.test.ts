import { describe, expect, it, vi } from "vitest";
import { serverConfig } from "@lumen/config";
import { createInternalApp } from "../internal-app.js";
import type { Express } from "express";

async function req(
  app: Express,
  path: string,
  token?: string,
): Promise<{ status: number; body: unknown }> {
  const { createServer } = await import("http");
  return new Promise((resolve, reject) => {
    const server = createServer(app);
    server.listen(0, () => {
      const port = (server.address() as { port: number }).port;
      fetch(`http://localhost:${port}${path}`, {
        headers: token ? { "x-internal-service-token": token } : {},
      })
        .then(async (res) => {
          const json = await res.json();
          server.close();
          resolve({ status: res.status, body: json });
        })
        .catch((err) => {
          server.close();
          reject(err);
        });
    });
  });
}

describe("GET /internal/tx/:txHash/merkle-root", () => {
  it("rejects requests without a valid internal service token", async () => {
    const app = createInternalApp(async () => "some-root");
    const { status } = await req(app, "/internal/tx/tx-1/merkle-root");
    expect(status).toBe(401);
  });

  it("rejects requests with the wrong token", async () => {
    const app = createInternalApp(async () => "some-root");
    const { status } = await req(app, "/internal/tx/tx-1/merkle-root", "wrong-token");
    expect(status).toBe(401);
  });

  it("returns the merkle root for a known transaction", async () => {
    const getMerkleRootForTx = vi.fn(async (txHash: string) => `root-for-${txHash}`);
    const app = createInternalApp(getMerkleRootForTx);

    const { status, body } = await req(app, "/internal/tx/tx-abc/merkle-root", serverConfig.internalServiceToken);

    expect(status).toBe(200);
    expect(body).toEqual({ merkleRoot: "root-for-tx-abc" });
    expect(getMerkleRootForTx).toHaveBeenCalledWith("tx-abc");
  });

  it("returns 404 when the transaction has no merkle root data entry", async () => {
    const app = createInternalApp(async () => null);
    const { status, body } = await req(app, "/internal/tx/tx-missing/merkle-root", serverConfig.internalServiceToken);

    expect(status).toBe(404);
    expect(body).toMatchObject({ error: "NOT_FOUND" });
  });

  it("returns 502 when the lookup throws (e.g. Horizon unreachable)", async () => {
    const app = createInternalApp(async () => {
      throw new Error("horizon down");
    });
    const { status, body } = await req(app, "/internal/tx/tx-1/merkle-root", serverConfig.internalServiceToken);

    expect(status).toBe(502);
    expect(body).toMatchObject({ error: "HORIZON_ERROR" });
  });
});
