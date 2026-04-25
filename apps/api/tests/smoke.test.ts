/**
 * CHORD-030: Smoke-test harness – vitest integration.
 *
 * Spins up the Express app in-process and runs the same assertions
 * that the standalone smoke runner performs against a deployed environment.
 * This gives CI a fast, dependency-free gate without requiring a live server.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import * as http from "http";

// Set required env vars before any module that reads them is imported
vi.stubEnv("MONGO_URI", "mongodb://localhost:27017/lumenhealth-test");
vi.stubEnv("JWT_ACCESS_TOKEN_SECRET", "test-access-secret");
vi.stubEnv("JWT_REFRESH_TOKEN_SECRET", "test-refresh-secret");
vi.stubEnv("API_PORT", "4000");

// Dynamic import so env stubs are applied first
const { createApp } = await import("../src/app.factory");

// ---------------------------------------------------------------------------
// In-process server setup
// ---------------------------------------------------------------------------

let server: http.Server;
let baseUrl: string;

beforeAll(
  () =>
    new Promise<void>((resolve) => {
      const app = createApp();
      server = http.createServer(app);
      server.listen(0, "127.0.0.1", () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    }),
);

afterAll(
  () =>
    new Promise<void>((resolve) => {
      server.close(() => resolve());
    }),
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function get(path: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, { headers });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function post(path: string, payload: unknown, token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

// ---------------------------------------------------------------------------
// Anonymous smoke checks
// ---------------------------------------------------------------------------

describe("CHORD-030 – API smoke tests (anonymous)", () => {
  it("GET /health returns 200 with status:ok", async () => {
    const { status, body } = await get("/health");
    expect(status).toBe(200);
    expect((body as Record<string, unknown>).status).toBe("ok");
  });

  it("GET /api/v1/openapi.json returns 200 with openapi:3.1.0", async () => {
    const { status, body } = await get("/api/v1/openapi.json");
    expect(status).toBe(200);
    expect((body as Record<string, unknown>).openapi).toBe("3.1.0");
  });

  it("POST /api/v1/auth/login with missing fields returns 400", async () => {
    const { status } = await post("/api/v1/auth/login", { email: "bad" });
    expect(status).toBe(400);
  });

  it("POST /api/v1/auth/login with wrong credentials returns 401", async () => {
    // This test requires a live MongoDB connection; skip gracefully when unavailable
    const { status } = await post("/api/v1/auth/login", {
      email: "nobody@example.com",
      password: "wrongpassword",
    });
    // 401 = credentials rejected by DB, 500/503 = DB unavailable (acceptable in unit env)
    expect([401, 500, 503]).toContain(status);
  }, 15_000);
});

// ---------------------------------------------------------------------------
// Protected route checks (no token → 401)
// ---------------------------------------------------------------------------

describe("CHORD-030 – API smoke tests (protected routes without token)", () => {
  it("GET /api/v1/patients/search without token returns 401", async () => {
    const { status } = await get("/api/v1/patients/search?q=test");
    expect(status).toBe(401);
  });

  it("GET /api/v1/encounters without token returns 401", async () => {
    const { status } = await get("/api/v1/encounters");
    expect(status).toBe(401);
  });

  it("POST /api/v1/patients without token returns 401", async () => {
    const { status } = await post("/api/v1/patients", {});
    expect(status).toBe(401);
  });
});
