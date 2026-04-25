import { describe, it, expect, beforeEach } from "vitest";
import { z } from "zod";

// Import builder functions directly so we can test in isolation
// without side-effects from the route registrations in openapi.routes.ts
import { buildOpenApiDocument, registerRoute } from "../src/openapi/openapi.builder";

// Reset the internal routes array between tests by re-importing the module
// (vitest isolates modules per test file by default)

describe("CHORD-029 – OpenAPI builder", () => {
  it("produces a valid OpenAPI 3.1 envelope", () => {
    const doc = buildOpenApiDocument();
    expect(doc.openapi).toBe("3.1.0");
    expect((doc.info as Record<string, unknown>).title).toBe("LumenHealth API");
    expect(doc.paths).toBeDefined();
  });

  it("converts a ZodObject body schema to a JSON Schema object", () => {
    registerRoute({
      method: "post",
      path: "/test-body",
      summary: "Test body conversion",
      tag: "Test",
      body: z.object({ name: z.string(), age: z.number() }),
    });

    const doc = buildOpenApiDocument();
    const op = (doc.paths as Record<string, Record<string, unknown>>)["/test-body"]?.post as Record<string, unknown>;
    expect(op).toBeDefined();
    const body = op.requestBody as Record<string, unknown>;
    const schema = (body.content as Record<string, unknown>)["application/json"] as Record<string, unknown>;
    expect((schema.schema as Record<string, unknown>).type).toBe("object");
  });

  it("converts path params to OpenAPI {param} syntax", () => {
    registerRoute({
      method: "get",
      path: "/items/:id",
      summary: "Get item",
      tag: "Test",
      params: z.object({ id: z.string() }),
    });

    const doc = buildOpenApiDocument();
    const paths = doc.paths as Record<string, unknown>;
    expect(paths["/items/{id}"]).toBeDefined();
  });

  it("adds bearerAuth security when auth: true", () => {
    registerRoute({
      method: "get",
      path: "/secure-endpoint",
      summary: "Secure",
      tag: "Test",
      auth: true,
    });

    const doc = buildOpenApiDocument();
    const op = (doc.paths as Record<string, Record<string, unknown>>)["/secure-endpoint"]?.get as Record<string, unknown>;
    expect(op.security).toEqual([{ bearerAuth: [] }]);
  });

  it("includes query parameters when provided", () => {
    registerRoute({
      method: "get",
      path: "/search",
      summary: "Search",
      tag: "Test",
      query: z.object({ q: z.string().optional(), limit: z.string() }),
    });

    const doc = buildOpenApiDocument();
    const op = (doc.paths as Record<string, Record<string, unknown>>)["/search"]?.get as Record<string, unknown>;
    const params = op.parameters as Array<Record<string, unknown>>;
    expect(params.some((p) => p.name === "q")).toBe(true);
    expect(params.some((p) => p.name === "limit")).toBe(true);
  });
});
