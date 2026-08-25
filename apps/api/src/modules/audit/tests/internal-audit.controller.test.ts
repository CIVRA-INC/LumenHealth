import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import type { Express } from "express";
import { serverConfig } from "@lumen/config";
import type { BatchAnchorResult } from "@lumen/types";
import { internalAuditRouter } from "../routes/internal.js";
import { auditStore } from "../repositories/audit.repository.js";
import { recordAudit } from "../services/audit.service.js";

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use("/internal/audit", internalAuditRouter);
  return app;
}

async function req(
  app: Express,
  method: "GET" | "POST",
  path: string,
  options: { token?: string; body?: unknown } = {},
): Promise<{ status: number; body: unknown }> {
  const { createServer } = await import("http");
  return new Promise((resolve, reject) => {
    const server = createServer(app);
    server.listen(0, () => {
      const port = (server.address() as { port: number }).port;
      fetch(`http://localhost:${port}${path}`, {
        method,
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

describe("internal audit routes", () => {
  const app = buildApp();

  beforeEach(() => {
    auditStore._reset();
  });

  it("rejects requests without a valid internal service token", async () => {
    const { status } = await req(app, "GET", "/internal/audit/unanchored");
    expect(status).toBe(401);
  });

  it("rejects requests with the wrong token", async () => {
    const { status } = await req(app, "GET", "/internal/audit/unanchored", { token: "wrong" });
    expect(status).toBe(401);
  });

  it("lists unanchored entries as {auditId, sha256Hash}", async () => {
    const a = recordAudit({
      clinicId: "c-1",
      action: "staff.invited",
      actorId: "actor-1",
      actorRole: "owner",
    });

    const { status, body } = await req(app, "GET", "/internal/audit/unanchored", {
      token: serverConfig.internalServiceToken,
    });

    expect(status).toBe(200);
    const result = body as { entries: { auditId: string; sha256Hash: string }[] };
    expect(result.entries).toEqual([{ auditId: a.auditId, sha256Hash: a.sha256Hash }]);
  });

  it("excludes already-anchored entries from the unanchored list", async () => {
    const a = recordAudit({
      clinicId: "c-1",
      action: "staff.invited",
      actorId: "actor-1",
      actorRole: "owner",
    });
    const b = recordAudit({
      clinicId: "c-1",
      action: "staff.invited",
      actorId: "actor-1",
      actorRole: "owner",
    });

    const anchorResult: BatchAnchorResult = {
      merkleRoot: "root-hash",
      stellarTxHash: "tx-hash",
      anchoredAt: new Date().toISOString(),
      entries: [{ auditId: a.auditId, merkleProof: [] }],
    };

    await req(app, "POST", "/internal/audit/anchor-result", {
      token: serverConfig.internalServiceToken,
      body: anchorResult,
    });

    const { body } = await req(app, "GET", "/internal/audit/unanchored", {
      token: serverConfig.internalServiceToken,
    });
    // `a` is now anchored, so it should drop out. The anchor call itself
    // records a fresh (unanchored) "batch.anchored" entry, so `b` is
    // present alongside it rather than being the only entry left.
    const result = body as { entries: { auditId: string }[] };
    expect(result.entries.map((e) => e.auditId)).toContain(b.auditId);
    expect(result.entries.map((e) => e.auditId)).not.toContain(a.auditId);
  });

  it("applies an anchor result, stamping tx hash/root/proof on each entry, and records a batch.anchored event", async () => {
    const a = recordAudit({
      clinicId: "c-1",
      action: "staff.invited",
      actorId: "actor-1",
      actorRole: "owner",
    });

    const proof = [{ hash: "sibling-hash", position: "right" as const }];
    const anchorResult: BatchAnchorResult = {
      merkleRoot: "root-hash",
      stellarTxHash: "tx-hash",
      anchoredAt: "2026-01-01T00:00:00.000Z",
      entries: [{ auditId: a.auditId, merkleProof: proof }],
    };

    const { status, body } = await req(app, "POST", "/internal/audit/anchor-result", {
      token: serverConfig.internalServiceToken,
      body: anchorResult,
    });

    expect(status).toBe(200);
    expect(body).toEqual({ updated: 1 });

    const stored = auditStore.findById(a.auditId)!;
    expect(stored.stellarTxHash).toBe("tx-hash");
    expect(stored.merkleRoot).toBe("root-hash");
    expect(stored.anchoredAt).toBe("2026-01-01T00:00:00.000Z");
    expect(stored.merkleProof).toEqual(proof);

    const batchEvents = auditStore.query({ clinicId: "c-1", action: "batch.anchored" });
    expect(batchEvents.total).toBe(1);
    expect(batchEvents.entries[0]!.actorRole).toBe("system");
  });

  it("rejects a malformed anchor result body", async () => {
    const { status } = await req(app, "POST", "/internal/audit/anchor-result", {
      token: serverConfig.internalServiceToken,
      body: { merkleRoot: "x" },
    });
    expect(status).toBe(400);
  });
});
