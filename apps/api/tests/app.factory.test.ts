import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("app factory", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env.API_PORT = "4000";
    process.env.MONGO_URI = "mongodb://localhost:27017/lumenhealth-test";
    process.env.JWT_ACCESS_TOKEN_SECRET = "access-secret";
    process.env.JWT_REFRESH_TOKEN_SECRET = "refresh-secret";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("creates an express app without opening a socket", async () => {
    const { createApp } = await import("../src/app.factory");
    const app = createApp();

    expect(typeof app.listen).toBe("function");
  });

  it("serves health responses when mounted in a test server", async () => {
    const { createApp } = await import("../src/app.factory");
    const app = createApp();
    const server = await new Promise<import("http").Server>((resolve) => {
      const instance = app.listen(0, () => resolve(instance));
    });

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Unexpected server address");
    }

    const response = await fetch(`http://127.0.0.1:${address.port}/health`);
    const payload = (await response.json()) as { status?: string; featureFlags?: unknown };

    expect(response.status).toBe(200);
    expect(payload.status).toBe("ok");
    expect(payload.featureFlags).toBeTruthy();

    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  });
});
