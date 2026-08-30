import { describe, it, expect, vi, afterEach } from "vitest";
import express from "express";
import type { Express } from "express";
import { corsAllowlist, globalRateLimiter, securityHeaders } from "../middleware/security.js";
import { globalErrorHandler } from "../middleware/error-handler.js";

async function request(
  app: Express,
  method: string,
  path: string,
  headers: Record<string, string> = {},
): Promise<{ status: number; headers: Headers; body: unknown }> {
  const { createServer } = await import("http");
  return new Promise((resolve, reject) => {
    const server = createServer(app);
    server.listen(0, () => {
      const port = (server.address() as { port: number }).port;
      fetch(`http://localhost:${port}${path}`, { method, headers })
        .then(async (res) => {
          const text = await res.text();
          server.close();
          resolve({ status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null });
        })
        .catch((err) => {
          server.close();
          reject(err);
        });
    });
  });
}

afterEach(() => vi.restoreAllMocks());

describe("securityHeaders (issue #1016)", () => {
  it("sets baseline security response headers", async () => {
    const app = express();
    app.use(securityHeaders());
    app.get("/x", (_req, res) => res.json({ ok: true }));

    const { headers } = await request(app, "GET", "/x");
    expect(headers.get("x-content-type-options")).toBe("nosniff");
    expect(headers.get("x-frame-options")).toBe("DENY");
    expect(headers.get("referrer-policy")).toBe("no-referrer");
  });
});

describe("corsAllowlist (issue #1016)", () => {
  it("reflects an allowed origin and answers preflight with 204", async () => {
    const app = express();
    app.use(corsAllowlist(["http://allowed.test"]));
    app.get("/x", (_req, res) => res.json({ ok: true }));

    const ok = await request(app, "GET", "/x", { Origin: "http://allowed.test" });
    expect(ok.headers.get("access-control-allow-origin")).toBe("http://allowed.test");

    const preflight = await request(app, "OPTIONS", "/x", { Origin: "http://allowed.test" });
    expect(preflight.status).toBe(204);
  });

  it("does not set the allow-origin header for a disallowed origin", async () => {
    const app = express();
    app.use(corsAllowlist(["http://allowed.test"]));
    app.get("/x", (_req, res) => res.json({ ok: true }));

    const { headers } = await request(app, "GET", "/x", { Origin: "http://evil.test" });
    expect(headers.get("access-control-allow-origin")).toBeNull();
  });
});

describe("globalRateLimiter (issue #1016)", () => {
  it("returns 429 once the per-window max is exceeded", async () => {
    const app = express();
    app.use(globalRateLimiter({ windowMs: 60_000, max: 2 }));
    app.get("/x", (_req, res) => res.json({ ok: true }));

    expect((await request(app, "GET", "/x")).status).toBe(200);
    expect((await request(app, "GET", "/x")).status).toBe(200);
    expect((await request(app, "GET", "/x")).status).toBe(429);
  });
});

describe("globalErrorHandler (issue #1015)", () => {
  it("turns an uncaught route throw into a generic 500", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const app = express();
    app.get("/boom", () => {
      throw new Error("internal detail that must not leak");
    });
    app.use(globalErrorHandler);

    const { status, body } = await request(app, "GET", "/boom");
    expect(status).toBe(500);
    expect(body).toEqual({ error: "INTERNAL_ERROR", message: "internal server error" });
  });
});
