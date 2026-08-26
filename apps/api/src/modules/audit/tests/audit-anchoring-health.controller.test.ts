import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import type { Express } from "express";
import type { AnchoringHealthReport, UserRole } from "@lumen/types";
import { auditRouter } from "../routes/index.js";
import { identityStore } from "../../auth/repositories/identity.repository.js";
import { sessionStore } from "../../auth/repositories/session.repository.js";
import { _resetAuthStateForTests } from "../../auth/controllers/auth.controller.js";
import { buildTwoClinicFixture } from "../../auth/tests/fixtures.js";
import { accessTokenSigner } from "../../auth/services/token.service.js";

vi.mock("../services/stellar-verifier.client.js", async () => {
  const actual = await vi.importActual<typeof import("../services/stellar-verifier.client.js")>(
    "../services/stellar-verifier.client.js",
  );
  return { ...actual, fetchAnchoringHealth: vi.fn() };
});
import { AnchoringNotConfiguredError, fetchAnchoringHealth } from "../services/stellar-verifier.client.js";

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/audit", auditRouter);
  return app;
}

async function req(app: Express, path: string, token?: string): Promise<{ status: number; body: unknown }> {
  const { createServer } = await import("http");
  return new Promise((resolve, reject) => {
    const server = createServer(app);
    server.listen(0, () => {
      const port = (server.address() as { port: number }).port;
      fetch(`http://localhost:${port}${path}`, {
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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

const fakeHealth: AnchoringHealthReport = {
  lastSuccessfulTickAt: "2026-01-01T00:05:00.000Z",
  lastAnchorAt: "2026-01-01T00:05:00.000Z",
  consecutiveFailureCount: 0,
  unanchoredCount: 0,
  oldestUnanchoredAgeMs: null,
  pendingPersistCount: 0,
  checkedAt: "2026-01-01T00:06:00.000Z",
};

describe("GET /api/v1/audit/anchoring-health", () => {
  const app = buildApp();

  beforeEach(() => {
    _resetAuthStateForTests();
    identityStore._reset();
    sessionStore._reset();
    vi.mocked(fetchAnchoringHealth).mockReset();
  });

  it("returns 401 with no token", async () => {
    const { status } = await req(app, "/api/v1/audit/anchoring-health");
    expect(status).toBe(401);
  });

  it("returns 403 for clinician role", async () => {
    const { a } = buildTwoClinicFixture();
    const clinicianToken = tokenWithRole(a.clinicId, "clinician");
    const { status } = await req(app, "/api/v1/audit/anchoring-health", clinicianToken);
    expect(status).toBe(403);
  });

  it("returns the health report for owner/admin", async () => {
    vi.mocked(fetchAnchoringHealth).mockResolvedValue(fakeHealth);
    const { a } = buildTwoClinicFixture();

    const { status, body } = await req(app, "/api/v1/audit/anchoring-health", a.token);

    expect(status).toBe(200);
    expect(body).toEqual(fakeHealth);
  });

  it("returns 501 when the running stellar-service doesn't run the scheduler", async () => {
    vi.mocked(fetchAnchoringHealth).mockRejectedValue(new AnchoringNotConfiguredError());
    const { a } = buildTwoClinicFixture();

    const { status, body } = await req(app, "/api/v1/audit/anchoring-health", a.token);

    expect(status).toBe(501);
    expect(body).toMatchObject({ error: "NOT_CONFIGURED" });
  });

  it("returns 502 when stellar-service is unreachable", async () => {
    vi.mocked(fetchAnchoringHealth).mockRejectedValue(new Error("connect ECONNREFUSED"));
    const { a } = buildTwoClinicFixture();

    const { status, body } = await req(app, "/api/v1/audit/anchoring-health", a.token);

    expect(status).toBe(502);
    expect(body).toMatchObject({ error: "STELLAR_SERVICE_UNAVAILABLE" });
  });
});
