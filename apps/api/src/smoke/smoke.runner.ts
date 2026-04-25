/**
 * CHORD-030: Smoke-test harness for deployed API environments.
 *
 * Runs authenticated and anonymous checks against core routes with
 * environment-aware assertions. Designed to be executed against a
 * running instance (local, staging, or production) by setting:
 *
 *   SMOKE_BASE_URL   – base URL of the target environment (default: http://localhost:4000)
 *   SMOKE_AUTH_TOKEN – pre-issued JWT access token for authenticated checks (optional)
 *
 * Usage:
 *   npx tsx apps/api/src/smoke/smoke.runner.ts
 *   SMOKE_BASE_URL=https://api.staging.example.com SMOKE_AUTH_TOKEN=<jwt> npx tsx apps/api/src/smoke/smoke.runner.ts
 */

import { createApp } from "../app.factory";
import * as http from "http";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:4000";
const AUTH_TOKEN = process.env.SMOKE_AUTH_TOKEN ?? "";

// ---------------------------------------------------------------------------
// Minimal fetch wrapper (Node 18+ has global fetch)
// ---------------------------------------------------------------------------

async function get(path: string, auth = false): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth && AUTH_TOKEN) headers["Authorization"] = `Bearer ${AUTH_TOKEN}`;

  const res = await fetch(`${BASE_URL}${path}`, { headers });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function post(
  path: string,
  payload: unknown,
  auth = false,
): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth && AUTH_TOKEN) headers["Authorization"] = `Bearer ${AUTH_TOKEN}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

// ---------------------------------------------------------------------------
// Smoke checks
// ---------------------------------------------------------------------------

interface SmokeResult {
  name: string;
  passed: boolean;
  status?: number;
  error?: string;
}

const results: SmokeResult[] = [];

async function check(
  name: string,
  fn: () => Promise<void>,
): Promise<void> {
  try {
    await fn();
    results.push({ name, passed: true });
  } catch (err) {
    results.push({ name, passed: false, error: String(err) });
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

async function runSmoke(): Promise<void> {
  console.log(`\n🔥  Smoke tests → ${BASE_URL}\n`);

  // --- Anonymous checks ---

  await check("GET /health returns 200 with status:ok", async () => {
    const { status, body } = await get("/health");
    assert(status === 200, `Expected 200, got ${status}`);
    assert((body as Record<string, unknown>).status === "ok", "Missing status:ok");
  });

  await check("GET /api/v1/openapi.json returns 200 with openapi field", async () => {
    const { status, body } = await get("/api/v1/openapi.json");
    assert(status === 200, `Expected 200, got ${status}`);
    assert(
      (body as Record<string, unknown>).openapi === "3.1.0",
      "Missing openapi:3.1.0 field",
    );
  });

  await check("POST /api/v1/auth/login with bad credentials returns 401", async () => {
    const { status } = await post("/api/v1/auth/login", {
      email: "nobody@example.com",
      password: "wrong",
    });
    assert(status === 401, `Expected 401, got ${status}`);
  });

  await check("POST /api/v1/auth/login with invalid body returns 400", async () => {
    const { status } = await post("/api/v1/auth/login", { email: "not-an-email" });
    assert(status === 400, `Expected 400, got ${status}`);
  });

  // --- Authenticated checks (skipped when no token is provided) ---

  if (AUTH_TOKEN) {
    await check("GET /api/v1/patients returns 200 when authenticated", async () => {
      const { status } = await get("/api/v1/patients", true);
      assert(status === 200, `Expected 200, got ${status}`);
    });

    await check("GET /api/v1/encounters returns 200 when authenticated", async () => {
      const { status } = await get("/api/v1/encounters", true);
      assert([200, 404].includes(status), `Expected 200 or 404, got ${status}`);
    });
  } else {
    await check("GET /api/v1/patients without token returns 401", async () => {
      const { status } = await get("/api/v1/patients", false);
      assert(status === 401, `Expected 401, got ${status}`);
    });
  }

  // --- Report ---

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  for (const r of results) {
    const icon = r.passed ? "✅" : "❌";
    console.log(`  ${icon}  ${r.name}`);
    if (!r.passed) console.log(`       ${r.error}`);
  }

  console.log(`\n  ${passed} passed, ${failed} failed\n`);

  if (failed > 0) process.exit(1);
}

// ---------------------------------------------------------------------------
// Entry point (only runs when executed directly, not when imported)
// ---------------------------------------------------------------------------

// Export for programmatic use in tests
export { runSmoke, check, assert, get, post };

// Run when invoked directly
if (process.argv[1] && process.argv[1].endsWith("smoke.runner.ts")) {
  runSmoke().catch((err) => {
    console.error("Smoke runner crashed:", err);
    process.exit(1);
  });
}
