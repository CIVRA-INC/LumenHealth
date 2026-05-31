// Auth 025 — Controller integration tests for invalid credentials and validation failures
// Closes #460

import { describe, it, expect } from "vitest";
import express from "express";
import type { Express } from "express";
import { authRouter } from "../../../auth/router.js";

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/auth", authRouter);
  return app;
}

async function request(
  app: Express,
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<{ status: number; body: unknown }> {
  const url = `http://localhost`;
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };

  // Use Node's built-in fetch via the express app directly
  const { createServer } = await import("http");
  return new Promise((resolve, reject) => {
    const server = createServer(app);
    server.listen(0, () => {
      const port = (server.address() as { port: number }).port;
      fetch(`http://localhost:${port}${path}`, init)
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

describe("POST /api/v1/auth/register — validation failures", () => {
  const app = buildApp();

  it("returns 400 when email is missing", async () => {
    const { status, body } = await request(app, "POST", "/api/v1/auth/register", {
      password: "Passw0rd!",
      clinicName: "Test Clinic",
    });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toBe("AUTH_MISSING_CREDENTIALS");
  });

  it("returns 400 when password is missing", async () => {
    const { status, body } = await request(app, "POST", "/api/v1/auth/register", {
      email: "owner@clinic.test",
      clinicName: "Test Clinic",
    });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toBe("AUTH_MISSING_CREDENTIALS");
  });

  it("returns 400 when clinicName is missing", async () => {
    const { status, body } = await request(app, "POST", "/api/v1/auth/register", {
      email: "owner@clinic.test",
      password: "Passw0rd!",
    });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toBe("AUTH_MISSING_CREDENTIALS");
  });

  it("returns 400 when body is empty", async () => {
    const { status, body } = await request(app, "POST", "/api/v1/auth/register", {});
    expect(status).toBe(400);
    expect((body as { error: string }).error).toBe("AUTH_MISSING_CREDENTIALS");
  });
});

describe("POST /api/v1/auth/login — validation failures", () => {
  const app = buildApp();

  it("returns 400 when email is missing", async () => {
    const { status, body } = await request(app, "POST", "/api/v1/auth/login", {
      password: "Passw0rd!",
    });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toBe("AUTH_MISSING_CREDENTIALS");
  });

  it("returns 400 when password is missing", async () => {
    const { status, body } = await request(app, "POST", "/api/v1/auth/login", {
      email: "owner@clinic.test",
    });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toBe("AUTH_MISSING_CREDENTIALS");
  });

  it("returns 400 when body is empty", async () => {
    const { status, body } = await request(app, "POST", "/api/v1/auth/login", {});
    expect(status).toBe(400);
    expect((body as { error: string }).error).toBe("AUTH_MISSING_CREDENTIALS");
  });

  it("returns 400 when email is not a string", async () => {
    const { status, body } = await request(app, "POST", "/api/v1/auth/login", {
      email: 12345,
      password: "Passw0rd!",
    });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toBe("AUTH_MISSING_CREDENTIALS");
  });
});

describe("GET /api/v1/auth/me — token validation failures", () => {
  const app = buildApp();

  it("returns 401 when Authorization header is absent", async () => {
    const { status, body } = await request(app, "GET", "/api/v1/auth/me");
    expect(status).toBe(401);
    expect((body as { error: string }).error).toBe("AUTH_TOKEN_INVALID");
  });

  it("returns 401 when Authorization header is not Bearer", async () => {
    const { status, body } = await request(app, "GET", "/api/v1/auth/me", undefined, {
      Authorization: "Basic dXNlcjpwYXNz",
    });
    expect(status).toBe(401);
    expect((body as { error: string }).error).toBe("AUTH_TOKEN_INVALID");
  });

  it("error response conforms to AuthError shape", async () => {
    const { body } = await request(app, "GET", "/api/v1/auth/me");
    const err = body as { error: string; message: string };
    expect(typeof err.error).toBe("string");
    expect(typeof err.message).toBe("string");
  });

  it("returns 403 forbidden when role header lacks auth:read permission", async () => {
    const { status, body } = await request(app, "GET", "/api/v1/auth/me", undefined, {
      Authorization: "Bearer starter-token",
      "x-role": "cashier",
    });
    expect(status).toBe(403);
    expect((body as { error: string }).error).toBe("AUTH_FORBIDDEN");
  });
});

describe("POST /api/v1/auth/refresh — basic validation and replay signal", () => {
  const app = buildApp();

  it("returns 401 when refresh token is missing", async () => {
    const { status, body } = await request(app, "POST", "/api/v1/auth/refresh", {});
    expect(status).toBe(401);
    expect((body as { error: string }).error).toBe("AUTH_TOKEN_INVALID");
  });
});

describe("POST /api/v1/auth/password-reset/request", () => {
  const app = buildApp();
  it("returns 200 ok for reset request", async () => {
    const { status, body } = await request(app, "POST", "/api/v1/auth/password-reset/request", {
      email: "owner@clinic.test",
    });
    expect(status).toBe(200);
    expect((body as { ok: boolean }).ok).toBe(true);
  });
});
