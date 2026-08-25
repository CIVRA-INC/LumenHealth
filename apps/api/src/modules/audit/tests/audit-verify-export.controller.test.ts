import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import type { Express } from "express";
import type { AuditExportBundle, AuditExportVerifyReport } from "@lumen/types";
import { auditRouter } from "../routes/index.js";

vi.mock("../services/stellar-verifier.client.js", async () => {
  const actual = await vi.importActual<typeof import("../services/stellar-verifier.client.js")>(
    "../services/stellar-verifier.client.js",
  );
  return {
    ...actual,
    fetchAnchoredMerkleRoot: vi.fn(),
    signExportManifest: vi.fn(),
    verifyExportBundleRemote: vi.fn(),
  };
});
import { InvalidExportBundleError, verifyExportBundleRemote } from "../services/stellar-verifier.client.js";

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/audit", auditRouter);
  return app;
}

async function post(app: Express, path: string, body: unknown): Promise<{ status: number; body: unknown }> {
  const { createServer } = await import("http");
  return new Promise((resolve, reject) => {
    const server = createServer(app);
    server.listen(0, () => {
      const port = (server.address() as { port: number }).port;
      fetch(`http://localhost:${port}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

const genuineBundle: AuditExportBundle = {
  manifest: {
    clinicId: "c-1",
    generatedAt: "2026-01-01T00:00:00.000Z",
    range: {},
    entryCount: 1,
    entriesDigest: "a".repeat(64),
  },
  signature: "fake-signature",
  signingPublicKey: "GFAKEPUBLICKEY",
  entries: [
    {
      auditId: "a-1",
      clinicId: "c-1",
      action: "staff.invited",
      actorId: "actor-1",
      actorRole: "owner",
      createdAt: "2026-01-01T00:00:00.000Z",
      sha256Hash: "b".repeat(64),
    },
  ],
};

const fakeReport: AuditExportVerifyReport = {
  clinicId: "c-1",
  signatureValid: true,
  entriesDigestValid: true,
  results: [{ auditId: "a-1", action: "staff.invited", status: "verified" }],
  verifiedCount: 1,
  unanchoredCount: 0,
  tamperedCount: 0,
  ok: true,
};

describe("POST /api/v1/audit/verify-export", () => {
  const app = buildApp();

  beforeEach(() => {
    vi.mocked(verifyExportBundleRemote).mockReset();
  });

  it("requires no authentication", async () => {
    vi.mocked(verifyExportBundleRemote).mockResolvedValue(fakeReport);
    const { status } = await post(app, "/api/v1/audit/verify-export", { bundle: genuineBundle });
    expect(status).toBe(200);
  });

  it("returns the verification report from stellar-service for a well-formed bundle", async () => {
    vi.mocked(verifyExportBundleRemote).mockResolvedValue(fakeReport);

    const { status, body } = await post(app, "/api/v1/audit/verify-export", { bundle: genuineBundle });

    expect(status).toBe(200);
    expect(body).toEqual(fakeReport);
    expect(verifyExportBundleRemote).toHaveBeenCalledWith(genuineBundle);
  });

  it("returns 400 for a body that isn't a plausible export bundle, without calling stellar-service", async () => {
    const { status, body } = await post(app, "/api/v1/audit/verify-export", { bundle: { not: "a bundle" } });

    expect(status).toBe(400);
    expect(body).toMatchObject({ error: "INVALID_BODY" });
    expect(verifyExportBundleRemote).not.toHaveBeenCalled();
  });

  it("returns 400 for a missing bundle field", async () => {
    const { status } = await post(app, "/api/v1/audit/verify-export", {});
    expect(status).toBe(400);
  });

  it("returns 400 when stellar-service rejects the bundle as malformed", async () => {
    vi.mocked(verifyExportBundleRemote).mockRejectedValue(new InvalidExportBundleError("bad bundle"));

    const { status, body } = await post(app, "/api/v1/audit/verify-export", { bundle: genuineBundle });

    expect(status).toBe(400);
    expect(body).toMatchObject({ error: "INVALID_BODY" });
  });

  it("returns 502 when stellar-service is unreachable", async () => {
    vi.mocked(verifyExportBundleRemote).mockRejectedValue(new Error("connect ECONNREFUSED"));

    const { status, body } = await post(app, "/api/v1/audit/verify-export", { bundle: genuineBundle });

    expect(status).toBe(502);
    expect(body).toMatchObject({ error: "STELLAR_SERVICE_UNAVAILABLE" });
  });

  it("flags a bundle whose entries aren't an array", async () => {
    const malformed = { ...genuineBundle, entries: "not-an-array" };
    const { status } = await post(app, "/api/v1/audit/verify-export", { bundle: malformed });
    expect(status).toBe(400);
  });
});
