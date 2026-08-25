import { describe, expect, it, vi } from "vitest";
import { serverConfig } from "@lumen/config";
import { createInternalApp } from "../internal-app.js";
import type { SignPayload } from "../internal-app.js";
import type { Express } from "express";
import { Keypair } from "@stellar/stellar-sdk";
import {
  buildMerkleTree,
  canonicalize,
  getMerkleProof,
  hashAuditEntry,
  sha256Hash,
  type AuditEntry,
  type AuditExportBundle,
  type HashableAuditEntry,
} from "@lumen/types";
import { signPayload } from "../signing.js";

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

function makeGenuineBundle(): { bundle: AuditExportBundle; onChainRoot: string } {
  const signingKeypair = Keypair.random();

  const hashable: HashableAuditEntry = {
    auditId: "a-genuine",
    clinicId: "c-1",
    action: "staff.role_changed",
    actorId: "actor-1",
    actorRole: "owner",
    targetId: "staff-1",
    targetType: "staff",
    before: { role: "clinician" },
    after: { role: "admin" },
    createdAt: "2026-01-01T00:00:00.000Z",
  };
  const entryHash = hashAuditEntry(hashable);
  const tree = buildMerkleTree([entryHash]);

  const entry: AuditEntry = {
    ...hashable,
    sha256Hash: entryHash,
    stellarTxHash: "tx-batch-1",
    merkleRoot: tree.root,
    anchoredAt: "2026-01-02T00:00:00.000Z",
    merkleProof: getMerkleProof(tree, 0),
  };

  const entriesDigest = sha256Hash([{ auditId: entry.auditId, sha256Hash: entry.sha256Hash }]);
  const manifest = {
    clinicId: "c-1",
    generatedAt: "2026-01-03T00:00:00.000Z",
    range: {},
    entryCount: 1,
    entriesDigest,
  };

  const { signature, publicKey } = signPayload(signingKeypair, canonicalize(manifest));

  const bundle: AuditExportBundle = {
    manifest,
    signature,
    signingPublicKey: publicKey,
    entries: [entry],
  };

  return { bundle, onChainRoot: tree.root };
}

describe("POST /internal/verify-export", () => {
  it("rejects requests without a valid internal service token", async () => {
    const app = createInternalApp(async () => null, fakeSignPayload);
    const { bundle } = makeGenuineBundle();
    const { status } = await req(app, "/internal/verify-export", { method: "POST", body: { bundle } });
    expect(status).toBe(401);
  });

  it("rejects a malformed body that isn't a plausible export bundle", async () => {
    const app = createInternalApp(async () => null, fakeSignPayload);
    const { status, body } = await req(app, "/internal/verify-export", {
      method: "POST",
      token: serverConfig.internalServiceToken,
      body: { bundle: { not: "a bundle" } },
    });

    expect(status).toBe(400);
    expect(body).toMatchObject({ error: "INVALID_BODY" });
  });

  it("returns a verification report for a well-formed bundle, using the injected chain lookup", async () => {
    const { bundle, onChainRoot } = makeGenuineBundle();
    const getMerkleRootForTx = vi.fn(async () => onChainRoot);
    const app = createInternalApp(getMerkleRootForTx, fakeSignPayload);

    const { status, body } = await req(app, "/internal/verify-export", {
      method: "POST",
      token: serverConfig.internalServiceToken,
      body: { bundle },
    });

    expect(status).toBe(200);
    expect(body).toMatchObject({ ok: true, signatureValid: true, verifiedCount: 1 });
    expect(getMerkleRootForTx).toHaveBeenCalledWith("tx-batch-1");
  });

  it("reports a per-entry chain-lookup failure as 'tampered' rather than failing the whole request", async () => {
    // verifyExportBundle treats a chain-lookup error the same as "no matching
    // root" for that entry — the overall HTTP call still succeeds with a report.
    const { bundle } = makeGenuineBundle();
    const app = createInternalApp(async () => {
      throw new Error("horizon down");
    }, fakeSignPayload);

    const { status, body } = await req(app, "/internal/verify-export", {
      method: "POST",
      token: serverConfig.internalServiceToken,
      body: { bundle },
    });

    expect(status).toBe(200);
    expect(body).toMatchObject({ ok: false, tamperedCount: 1 });
  });
});
