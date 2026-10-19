import { describe, expect, it } from "vitest";
import { serverConfig } from "@lumen/config";
import type { Express } from "express";
import { signInternalRequest, type InternalAuthSecret } from "@lumen/types";
import { createInternalApp } from "../internal-app.js";
import type { SignPayload } from "../internal-app.js";

const fakeSignPayload: SignPayload = (payload) => ({
  signature: `sig-for-${payload}`,
  publicKey: "GFAKEPUBLICKEY",
});

/** A real, always-answerable internal route: returns the merkle root (200). */
const TX_PATH = "/internal/tx/tx-auth/merkle-root";

/** Minimal app: the auth middleware runs on every internal route. */
function buildApp(): Express {
  return createInternalApp(async () => "root", fakeSignPayload);
}

/**
 * Sends a request with explicitly supplied auth headers so tests can control
 * the timestamp, nonce, and signing secret (#1345). Bypasses the `req` helper
 * in `internal-app.test.ts`, which always signs a fresh request.
 */
async function send(
  app: Express,
  path: string,
  options: {
    method?: "GET" | "POST";
    headers?: Record<string, string>;
    body?: unknown;
  } = {},
): Promise<{ status: number; body: unknown }> {
  const { createServer } = await import("http");
  const method = options.method ?? "GET";
  return new Promise((resolve, reject) => {
    const server = createServer(app);
    server.listen(0, () => {
      const port = (server.address() as { port: number }).port;
      fetch(`http://localhost:${port}${path}`, {
        method,
        headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
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

const primary = serverConfig.internalServiceSecrets[0]!;

/** Signs the exact method+path the middleware will verify against. */
function sign(
  path: string,
  options: {
    nowMs?: number;
    nonce?: string;
    secret?: InternalAuthSecret;
    body?: unknown;
    method?: "GET" | "POST";
  } = {},
) {
  return signInternalRequest(
    { method: options.method ?? "GET", path, body: options.body },
    options.secret ?? primary,
    { nowMs: options.nowMs ?? Date.now(), nonce: options.nonce },
  );
}

describe("internal request auth middleware (#1345)", () => {
  it("accepts a freshly signed request", async () => {
    const { status, body } = await send(buildApp(), TX_PATH, { headers: sign(TX_PATH) });
    expect(status).toBe(200);
    expect(body).toEqual({ merkleRoot: "root" });
  });

  it("accepts a signed POST request with a body", async () => {
    const path = "/internal/sign";
    const body = { payload: "hello" };
    const { status, body: resBody } = await send(buildApp(), path, {
      method: "POST",
      headers: sign(path, { method: "POST", body }),
      body,
    });
    expect(status).toBe(200);
    expect(resBody).toMatchObject({ signature: "sig-for-hello" });
  });

  it("rejects a request with no auth headers", async () => {
    const { status } = await send(buildApp(), TX_PATH);
    expect(status).toBe(401);
  });

  it("rejects a stale signature beyond the tolerance window", async () => {
    const headers = sign(TX_PATH, { nowMs: Date.now() - 10 * 60 * 1000 });
    const { status, body } = await send(buildApp(), TX_PATH, { headers });
    expect(status).toBe(401);
    expect(body).toMatchObject({ error: "UNAUTHORIZED" });
  });

  it("rejects a signature from an unknown key id", async () => {
    const headers = sign(TX_PATH, { secret: { keyId: "unknown-key", secret: "nope" } });
    const { status, body } = await send(buildApp(), TX_PATH, { headers });
    expect(status).toBe(401);
    expect(body).toMatchObject({ error: "UNAUTHORIZED" });
  });

  it("rejects a replayed request (same nonce twice)", async () => {
    const app = buildApp();
    const headers = sign(TX_PATH, { nonce: "replayed-nonce-e2e" });

    const first = await send(app, TX_PATH, { headers });
    const second = await send(app, TX_PATH, { headers });

    expect(first.status).toBe(200);
    expect(second.status).toBe(401);
  });

  it("accepts a request signed with a newly-added secret, so a secret can be rotated without a coordinated restart", async () => {
    const rotated: InternalAuthSecret = { keyId: "2026-11", secret: "rotated-secret" };
    const headers = sign(TX_PATH, { secret: rotated });

    // Add the new secret alongside the existing one — the deployment order for
    // a rotation — without changing or restarting anything else.
    serverConfig.internalServiceSecrets.push(rotated);
    try {
      const { status } = await send(buildApp(), TX_PATH, { headers });
      expect(status).toBe(200);
    } finally {
      serverConfig.internalServiceSecrets.pop();
    }
  });

  it("rejects a tampered body", async () => {
    const path = "/internal/sign";
    const headers = sign(path, { method: "POST", body: { payload: "hello" } });
    const { status } = await send(buildApp(), path, {
      method: "POST",
      headers,
      body: { payload: "tampered" },
    });
    expect(status).toBe(401);
  });
});
