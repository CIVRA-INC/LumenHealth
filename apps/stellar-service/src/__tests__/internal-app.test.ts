import { describe, expect, it, vi } from "vitest";
import { serverConfig } from "@lumen/config";
import { createInternalApp } from "../internal-app.js";
import type { SignPayload } from "../internal-app.js";
import type { Express } from "express";

const fakeSignPayload: SignPayload = (payload) => ({
  signature: `sig-for-${payload}`,
  publicKey: "GFAKEPUBLICKEY",
});

async function req(
  app: Express,
  path: string,
  options: { method?: "GET" | "POST"; token?: string; body?: unknown } = {},
): Promise<{ status: number; body: unknown }> {
  const { createServer } = await import("http");
  return new Promise((resolve, reject) => {
    const server = createServer(app);
    server.listen(0, () => {
      const port = (server.address() as { port: number }).port;
      fetch(`http://localhost:${port}${path}`, {
        method: options.method ?? "GET",
        headers: {
          "Content-Type": "application/json",
          ...(options.token ? { "x-internal-service-token": options.token } : {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
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
    const app = createInternalApp(async () => "some-root", fakeSignPayload);
    const { status } = await req(app, "/internal/tx/tx-1/merkle-root");
    expect(status).toBe(401);
  });

  it("rejects requests with the wrong token", async () => {
    const app = createInternalApp(async () => "some-root", fakeSignPayload);
    const { status } = await req(app, "/internal/tx/tx-1/merkle-root", { token: "wrong-token" });
    expect(status).toBe(401);
  });

  it("returns the merkle root for a known transaction", async () => {
    const getMerkleRootForTx = vi.fn(async (txHash: string) => `root-for-${txHash}`);
    const app = createInternalApp(getMerkleRootForTx, fakeSignPayload);

    const { status, body } = await req(app, "/internal/tx/tx-abc/merkle-root", {
      token: serverConfig.internalServiceToken,
    });

    expect(status).toBe(200);
    expect(body).toEqual({ merkleRoot: "root-for-tx-abc" });
    expect(getMerkleRootForTx).toHaveBeenCalledWith("tx-abc");
  });

  it("returns 404 when the transaction has no merkle root data entry", async () => {
    const app = createInternalApp(async () => null, fakeSignPayload);
    const { status, body } = await req(app, "/internal/tx/tx-missing/merkle-root", {
      token: serverConfig.internalServiceToken,
    });

    expect(status).toBe(404);
    expect(body).toMatchObject({ error: "NOT_FOUND" });
  });

  it("returns 502 when the lookup throws (e.g. Horizon unreachable)", async () => {
    const app = createInternalApp(async () => {
      throw new Error("horizon down");
    }, fakeSignPayload);
    const { status, body } = await req(app, "/internal/tx/tx-1/merkle-root", {
      token: serverConfig.internalServiceToken,
    });

    expect(status).toBe(502);
    expect(body).toMatchObject({ error: "HORIZON_ERROR" });
  });
});

describe("POST /internal/sign", () => {
  it("rejects requests without a valid internal service token", async () => {
    const app = createInternalApp(async () => null, fakeSignPayload);
    const { status } = await req(app, "/internal/sign", { method: "POST", body: { payload: "hello" } });
    expect(status).toBe(401);
  });

  it("signs the given payload and returns the signature + public key", async () => {
    const app = createInternalApp(async () => null, fakeSignPayload);
    const { status, body } = await req(app, "/internal/sign", {
      method: "POST",
      token: serverConfig.internalServiceToken,
      body: { payload: "some-canonical-manifest" },
    });

    expect(status).toBe(200);
    expect(body).toEqual({ signature: "sig-for-some-canonical-manifest", publicKey: "GFAKEPUBLICKEY" });
  });

  it("rejects a missing or empty payload", async () => {
    const app = createInternalApp(async () => null, fakeSignPayload);
    const { status } = await req(app, "/internal/sign", {
      method: "POST",
      token: serverConfig.internalServiceToken,
      body: {},
    });
    expect(status).toBe(400);
  });

  it("returns 500 when signing throws", async () => {
    const app = createInternalApp(async () => null, () => {
      throw new Error("keypair unavailable");
    });
    const { status, body } = await req(app, "/internal/sign", {
      method: "POST",
      token: serverConfig.internalServiceToken,
      body: { payload: "x" },
    });

    expect(status).toBe(500);
    expect(body).toMatchObject({ error: "SIGNING_ERROR" });
  });
});
