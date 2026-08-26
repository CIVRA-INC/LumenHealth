import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import type { Express } from "express";
import type { BatchAnchorResult, UserRole } from "@lumen/types";
import { auditRouter } from "../routes/index.js";
import { auditStore } from "../repositories/audit.repository.js";
import { identityStore } from "../../auth/repositories/identity.repository.js";
import { sessionStore } from "../../auth/repositories/session.repository.js";
import { _resetAuthStateForTests } from "../../auth/controllers/auth.controller.js";
import { buildTwoClinicFixture } from "../../auth/tests/fixtures.js";
import { accessTokenSigner } from "../../auth/services/token.service.js";
import { recordAudit, applyBatchAnchorResult } from "../services/audit.service.js";

vi.mock("../services/stellar-verifier.client.js", () => ({
  fetchAnchoredMerkleRoot: vi.fn(),
}));
import { fetchAnchoredMerkleRoot } from "../services/stellar-verifier.client.js";

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

/** Anchors a single entry as its own one-leaf batch (root == leaf, empty proof). */
function anchorSingleEntry(auditId: string, sha256Hash: string, merkleRoot = sha256Hash) {
  const result: BatchAnchorResult = {
    merkleRoot,
    stellarTxHash: `tx-${auditId}`,
    anchoredAt: "2026-01-01T00:00:00.000Z",
    mode: "batched",
    entries: [{ auditId, merkleProof: [] }],
  };
  applyBatchAnchorResult(result);
  return result;
}

describe("GET /api/v1/audit/:auditId/verify", () => {
  const app = buildApp();

  beforeEach(() => {
    _resetAuthStateForTests();
    identityStore._reset();
    sessionStore._reset();
    auditStore._reset();
    vi.mocked(fetchAnchoredMerkleRoot).mockReset();
  });

  it("reports 'verified' for a genuine, untampered, anchored entry", async () => {
    const { a } = buildTwoClinicFixture();
    const entry = recordAudit({
      clinicId: a.clinicId,
      action: "staff.role_changed",
      actorId: "actor-1",
      actorRole: "owner",
      targetId: "staff-1",
      targetType: "staff",
      before: { role: "clinician" },
      after: { role: "admin" },
    });
    anchorSingleEntry(entry.auditId, entry.sha256Hash);
    vi.mocked(fetchAnchoredMerkleRoot).mockResolvedValue(entry.sha256Hash);

    const { status, body } = await req(app, `/api/v1/audit/${entry.auditId}/verify`, a.token);

    expect(status).toBe(200);
    expect(body).toMatchObject({
      auditId: entry.auditId,
      status: "verified",
      storedHash: entry.sha256Hash,
      recomputedHash: entry.sha256Hash,
    });
  });

  it("reports 'unanchored' for an entry not yet included in a batch", async () => {
    const { a } = buildTwoClinicFixture();
    const entry = recordAudit({
      clinicId: a.clinicId,
      action: "staff.invited",
      actorId: "actor-1",
      actorRole: "owner",
    });

    const { status, body } = await req(app, `/api/v1/audit/${entry.auditId}/verify`, a.token);

    expect(status).toBe(200);
    expect(body).toMatchObject({ status: "unanchored" });
    expect(fetchAnchoredMerkleRoot).not.toHaveBeenCalled();
  });

  it("catches a directly mutated before/after field as 'tampered' (hash no longer matches)", async () => {
    const { a } = buildTwoClinicFixture();
    const entry = recordAudit({
      clinicId: a.clinicId,
      action: "staff.role_changed",
      actorId: "actor-1",
      actorRole: "owner",
      targetId: "staff-1",
      targetType: "staff",
      before: { role: "clinician" },
      after: { role: "admin" },
    });
    anchorSingleEntry(entry.auditId, entry.sha256Hash);

    // Simulate an operator with DB access editing the record post-write —
    // the sha256Hash field is left untouched, only the content changes.
    const stored = auditStore.findById(entry.auditId)!;
    auditStore.save({ ...stored, after: { role: "owner" } });

    const { status, body } = await req(app, `/api/v1/audit/${entry.auditId}/verify`, a.token);

    expect(status).toBe(200);
    expect(body).toMatchObject({ status: "tampered", storedHash: entry.sha256Hash });
    const result = body as { recomputedHash: string };
    expect(result.recomputedHash).not.toBe(entry.sha256Hash);
    expect(fetchAnchoredMerkleRoot).not.toHaveBeenCalled();
  });

  it("catches an on-chain root mismatch as 'tampered' even when the stored hash is intact", async () => {
    const { a } = buildTwoClinicFixture();
    const entry = recordAudit({
      clinicId: a.clinicId,
      action: "staff.invited",
      actorId: "actor-1",
      actorRole: "owner",
    });
    anchorSingleEntry(entry.auditId, entry.sha256Hash);
    // Chain disagrees with what's stored locally as the anchored root.
    vi.mocked(fetchAnchoredMerkleRoot).mockResolvedValue("a-completely-different-root");

    const { status, body } = await req(app, `/api/v1/audit/${entry.auditId}/verify`, a.token);

    expect(status).toBe(200);
    expect(body).toMatchObject({ status: "tampered" });
  });

  it("returns 404 rather than another clinic's verification result (clinic isolation)", async () => {
    const { a, b } = buildTwoClinicFixture();
    const entry = recordAudit({
      clinicId: a.clinicId,
      action: "staff.invited",
      actorId: "actor-1",
      actorRole: "owner",
    });

    const { status } = await req(app, `/api/v1/audit/${entry.auditId}/verify`, b.token);
    expect(status).toBe(404);
  });

  it("returns 404 for a nonexistent auditId", async () => {
    const { a } = buildTwoClinicFixture();
    const { status } = await req(app, "/api/v1/audit/does-not-exist/verify", a.token);
    expect(status).toBe(404);
  });

  it("returns 403 for clinician role", async () => {
    const { a } = buildTwoClinicFixture();
    const entry = recordAudit({
      clinicId: a.clinicId,
      action: "staff.invited",
      actorId: "actor-1",
      actorRole: "owner",
    });
    const clinicianToken = tokenWithRole(a.clinicId, "clinician");

    const { status } = await req(app, `/api/v1/audit/${entry.auditId}/verify`, clinicianToken);
    expect(status).toBe(403);
  });

  it("returns 401 with no token", async () => {
    const { status } = await req(app, "/api/v1/audit/some-id/verify");
    expect(status).toBe(401);
  });

  it("returns 502 when stellar-service is unreachable", async () => {
    const { a } = buildTwoClinicFixture();
    const entry = recordAudit({
      clinicId: a.clinicId,
      action: "staff.invited",
      actorId: "actor-1",
      actorRole: "owner",
    });
    anchorSingleEntry(entry.auditId, entry.sha256Hash);
    vi.mocked(fetchAnchoredMerkleRoot).mockRejectedValue(new Error("connect ECONNREFUSED"));

    const { status } = await req(app, `/api/v1/audit/${entry.auditId}/verify`, a.token);
    expect(status).toBe(502);
  });
});
