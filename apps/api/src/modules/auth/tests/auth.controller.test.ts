import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import type { Express } from "express";
import { authRouter } from "../routes/index.js";
import { _resetAuthStateForTests } from "../controllers/auth.controller.js";
import { identityStore } from "../repositories/identity.repository.js";
import { sessionStore } from "../repositories/session.repository.js";

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
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };
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
    const { status, body } = await request(app, "POST", "/api/v1/auth/register", { password: "Passw0rd!", clinicName: "Test Clinic" });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toBe("AUTH_MISSING_CREDENTIALS");
  });

  it("returns 400 when password is missing", async () => {
    const { status, body } = await request(app, "POST", "/api/v1/auth/register", { email: "owner@clinic.test", clinicName: "Test Clinic" });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toBe("AUTH_MISSING_CREDENTIALS");
  });

  it("returns 400 when clinicName is missing", async () => {
    const { status, body } = await request(app, "POST", "/api/v1/auth/register", { email: "owner@clinic.test", password: "Passw0rd!" });
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
    const { status, body } = await request(app, "POST", "/api/v1/auth/login", { password: "Passw0rd!" });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toBe("AUTH_MISSING_CREDENTIALS");
  });

  it("returns 400 when password is missing", async () => {
    const { status, body } = await request(app, "POST", "/api/v1/auth/login", { email: "owner@clinic.test" });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toBe("AUTH_MISSING_CREDENTIALS");
  });

  it("returns 400 when body is empty", async () => {
    const { status, body } = await request(app, "POST", "/api/v1/auth/login", {});
    expect(status).toBe(400);
    expect((body as { error: string }).error).toBe("AUTH_MISSING_CREDENTIALS");
  });

  it("returns 400 when email is not a string", async () => {
    const { status, body } = await request(app, "POST", "/api/v1/auth/login", { email: 12345, password: "Passw0rd!" });
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
    const { status, body } = await request(app, "GET", "/api/v1/auth/me", undefined, { Authorization: "Basic dXNlcjpwYXNz" });
    expect(status).toBe(401);
    expect((body as { error: string }).error).toBe("AUTH_TOKEN_INVALID");
  });

  it("error response conforms to AuthError shape", async () => {
    const { body } = await request(app, "GET", "/api/v1/auth/me");
    const err = body as { error: string; message: string };
    expect(typeof err.error).toBe("string");
    expect(typeof err.message).toBe("string");
  });

  it("returns 401 for an unrecognised bearer token", async () => {
    const { status, body } = await request(app, "GET", "/api/v1/auth/me", undefined, { Authorization: "Bearer not-a-real-token" });
    expect(status).toBe(401);
    expect((body as { error: string }).error).toBe("AUTH_TOKEN_INVALID");
  });
});

describe("POST /api/v1/auth/refresh — validation", () => {
  const app = buildApp();

  it("returns 401 when refresh token is missing", async () => {
    const { status, body } = await request(app, "POST", "/api/v1/auth/refresh", {});
    expect(status).toBe(401);
    expect((body as { error: string }).error).toBe("AUTH_TOKEN_INVALID");
  });

  it("returns 401 for invalid refresh token", async () => {
    const { status, body } = await request(app, "POST", "/api/v1/auth/refresh", { refreshToken: "bad-token" });
    expect(status).toBe(401);
    expect((body as { error: string }).error).toBe("AUTH_TOKEN_INVALID");
  });
});

describe("POST /api/v1/auth/login — rate limiting", () => {
  const app = buildApp();

  it("returns 429 after repeated requests from same source", async () => {
    let lastStatus = 200;
    for (let i = 0; i < 11; i += 1) {
      const { status } = await request(app, "POST", "/api/v1/auth/login", {}, { "x-forwarded-for": "9.9.9.9" });
      lastStatus = status;
    }
    expect(lastStatus).toBe(429);
  });
});

describe("POST /api/v1/auth/password-reset/request", () => {
  const app = buildApp();
  it("returns 200 for reset request", async () => {
    const { status, body } = await request(app, "POST", "/api/v1/auth/password-reset/request", { email: "owner@clinic.test" });
    expect(status).toBe(200);
    expect((body as { ok: boolean }).ok).toBe(true);
  });
});

describe("GET /api/v1/auth/owner-only", () => {
  const app = buildApp();
  it("returns 401 without bearer token", async () => {
    const { status } = await request(app, "GET", "/api/v1/auth/owner-only");
    expect(status).toBe(401);
  });
});

describe("POST /api/v1/auth/register — success path", () => {
  const app = buildApp();

  beforeEach(() => {
    _resetAuthStateForTests();
    identityStore._reset();
    sessionStore._reset();
  });

  it("returns 201 with a valid JWT session on registration", async () => {
    const { status, body } = await request(app, "POST", "/api/v1/auth/register", {
      email: "new@clinic.test",
      password: "Passw0rd!",
      clinicName: "Test Clinic",
    });
    expect(status).toBe(201);
    const session = (body as { session: { userId: string; accessToken: string } }).session;
    expect(typeof session.userId).toBe("string");
    expect(session.accessToken.split(".").length).toBe(3);
  });

  it("returns 409 AUTH_EMAIL_TAKEN on duplicate registration", async () => {
    const payload = { email: "dup@clinic.test", password: "Passw0rd!", clinicName: "Dup Clinic" };
    await request(app, "POST", "/api/v1/auth/register", payload);
    const { status, body } = await request(app, "POST", "/api/v1/auth/register", payload);
    expect(status).toBe(409);
    expect((body as { error: string }).error).toBe("AUTH_EMAIL_TAKEN");
  });
});

describe("POST /api/v1/auth/login — success and failure paths", () => {
  const app = buildApp();

  beforeEach(() => {
    _resetAuthStateForTests();
    identityStore._reset();
    sessionStore._reset();
  });

  it("returns 200 with a session after successful login", async () => {
    await request(app, "POST", "/api/v1/auth/register", { email: "login@clinic.test", password: "Passw0rd!", clinicName: "Login Clinic" });
    const { status, body } = await request(app, "POST", "/api/v1/auth/login", { email: "login@clinic.test", password: "Passw0rd!" });
    expect(status).toBe(200);
    const session = (body as { session: { accessToken: string } }).session;
    expect(typeof session.accessToken).toBe("string");
  });

  it("returns 401 AUTH_INVALID_CREDENTIALS for wrong password", async () => {
    await request(app, "POST", "/api/v1/auth/register", { email: "wrongpw@clinic.test", password: "Passw0rd!", clinicName: "PW Clinic" });
    const { status, body } = await request(app, "POST", "/api/v1/auth/login", { email: "wrongpw@clinic.test", password: "WrongPassword!" });
    expect(status).toBe(401);
    expect((body as { error: string }).error).toBe("AUTH_INVALID_CREDENTIALS");
  });

  it("returns 401 AUTH_INVALID_CREDENTIALS for a non-existent account", async () => {
    const { status, body } = await request(app, "POST", "/api/v1/auth/login", { email: "ghost@clinic.test", password: "Passw0rd!" });
    expect(status).toBe(401);
    expect((body as { error: string }).error).toBe("AUTH_INVALID_CREDENTIALS");
  });
});
