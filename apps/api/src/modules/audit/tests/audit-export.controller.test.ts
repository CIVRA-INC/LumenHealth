import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import type { Express } from "express";
import { canonicalize, sha256Hash } from "@lumen/types";
import type { AuditExportBundle, UserRole } from "@lumen/types";
import { auditRouter } from "../routes/index.js";
import { auditStore } from "../repositories/audit.repository.js";
import { identityStore } from "../../auth/repositories/identity.repository.js";
import { sessionStore } from "../../auth/repositories/session.repository.js";
import { _resetAuthStateForTests } from "../../auth/controllers/auth.controller.js";
import { buildTwoClinicFixture } from "../../auth/tests/fixtures.js";
import { accessTokenSigner } from "../../auth/services/token.service.js";
import { recordAudit } from "../services/audit.service.js";

vi.mock("../services/stellar-verifier.client.js", () => ({
  fetchAnchoredMerkleRoot: vi.fn(),
  signExportManifest: vi.fn(),
}));
import { signExportManifest } from "../services/stellar-verifier.client.js";

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/audit", auditRouter);
  return app;
}

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
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
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

function tokenWithRole(clinicId: string, role: UserRole): string {
  return accessTokenSigner.sign({ sub: `user-${role}-${clinicId}`, clinicId, role });
}

describe("GET /api/v1/audit/export", () => {
  const app = buildApp();

  beforeEach(() => {
    _resetAuthStateForTests();
    identityStore._reset();
    sessionStore._reset();
    auditStore._reset();
    vi.mocked(signExportManifest).mockReset();
    vi.mocked(signExportManifest).mockResolvedValue({
      signature: "fake-signature",
      publicKey: "GFAKEPUBLICKEY",
    });
  });

  it("returns a signed bundle containing every entry for the caller's clinic", async () => {
    const { a } = buildTwoClinicFixture();
    const e1 = recordAudit({
      clinicId: a.clinicId,
      action: "staff.invited",
      actorId: "actor-1",
      actorRole: "owner",
    });
    const e2 = recordAudit({
      clinicId: a.clinicId,
      action: "clinic.updated",
      actorId: "actor-1",
      actorRole: "owner",
    });

    const { status, body } = await req(app, "/api/v1/audit/export", a.token);
    const bundle = body as AuditExportBundle;

    expect(status).toBe(200);
    expect(bundle.manifest.clinicId).toBe(a.clinicId);
    expect(bundle.manifest.entryCount).toBe(2);
    expect(bundle.entries.map((e) => e.auditId).sort()).toEqual([e1.auditId, e2.auditId].sort());
    expect(bundle.signature).toBe("fake-signature");
    expect(bundle.signingPublicKey).toBe("GFAKEPUBLICKEY");
  });

  it("signs the canonicalized manifest, not the raw entries", async () => {
    const { a } = buildTwoClinicFixture();
    recordAudit({ clinicId: a.clinicId, action: "staff.invited", actorId: "actor-1", actorRole: "owner" });

    await req(app, "/api/v1/audit/export", a.token);

    expect(signExportManifest).toHaveBeenCalledTimes(1);
    const signedPayload = vi.mocked(signExportManifest).mock.calls[0]![0];
    expect(() => JSON.parse(signedPayload)).not.toThrow();
    expect(signedPayload).not.toContain("before");
  });

  it("produces an entriesDigest that a verifier can independently recompute", async () => {
    const { a } = buildTwoClinicFixture();
    const e1 = recordAudit({ clinicId: a.clinicId, action: "staff.invited", actorId: "actor-1", actorRole: "owner" });

    const { body } = await req(app, "/api/v1/audit/export", a.token);
    const bundle = body as AuditExportBundle;

    const recomputed = sha256Hash(
      bundle.entries
        .map((e) => ({ auditId: e.auditId, sha256Hash: e.sha256Hash }))
        .sort((x, y) => x.auditId.localeCompare(y.auditId)),
    );

    expect(bundle.manifest.entriesDigest).toBe(recomputed);
    expect(bundle.entries[0]!.sha256Hash).toBe(e1.sha256Hash);
  });

  it("only includes entries within the requested date range", async () => {
    const { a } = buildTwoClinicFixture();
    recordAudit({ clinicId: a.clinicId, action: "staff.invited", actorId: "actor-1", actorRole: "owner" });

    const { body } = await req(
      app,
      `/api/v1/audit/export?from=${encodeURIComponent("2099-01-01")}&to=${encodeURIComponent("2099-12-31")}`,
      a.token,
    );
    const bundle = body as AuditExportBundle;

    expect(bundle.manifest.entryCount).toBe(0);
    expect(bundle.entries).toHaveLength(0);
  });

  it("scopes the export to the caller's own clinic (isolation)", async () => {
    const { a, b } = buildTwoClinicFixture();
    recordAudit({ clinicId: a.clinicId, action: "staff.invited", actorId: "actor-1", actorRole: "owner" });
    recordAudit({ clinicId: b.clinicId, action: "staff.invited", actorId: "actor-1", actorRole: "owner" });

    const { body } = await req(app, "/api/v1/audit/export", a.token);
    const bundle = body as AuditExportBundle;

    expect(bundle.entries.every((e) => e.clinicId === a.clinicId)).toBe(true);
  });

  it("returns 403 for clinician role", async () => {
    const { a } = buildTwoClinicFixture();
    const clinicianToken = tokenWithRole(a.clinicId, "clinician");
    const { status } = await req(app, "/api/v1/audit/export", clinicianToken);
    expect(status).toBe(403);
  });

  it("returns 401 with no token", async () => {
    const { status } = await req(app, "/api/v1/audit/export");
    expect(status).toBe(401);
  });

  it("returns 502 when stellar-service signing is unreachable", async () => {
    const { a } = buildTwoClinicFixture();
    vi.mocked(signExportManifest).mockRejectedValue(new Error("connect ECONNREFUSED"));

    const { status } = await req(app, "/api/v1/audit/export", a.token);
    expect(status).toBe(502);
  });

  it("does not sign the entries array as a JSON literal (uses canonicalize, sorted keys)", async () => {
    const { a } = buildTwoClinicFixture();
    recordAudit({ clinicId: a.clinicId, action: "staff.invited", actorId: "actor-1", actorRole: "owner" });

    await req(app, "/api/v1/audit/export", a.token);

    const signedPayload = vi.mocked(signExportManifest).mock.calls[0]![0];
    const parsed = JSON.parse(signedPayload) as Record<string, unknown>;
    expect(Object.keys(parsed).sort()).toEqual(Object.keys(parsed));
    expect(canonicalize(parsed)).toBe(signedPayload);
  });
});
