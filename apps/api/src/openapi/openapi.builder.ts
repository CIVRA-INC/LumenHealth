/**
 * CHORD-029: OpenAPI generation from route contracts
 *
 * Builds a machine-readable OpenAPI 3.1 document from the Zod schemas
 * that already enforce validation at runtime. The spec is served at
 * GET /api/v1/openapi.json and stays in sync with the actual contracts
 * because it is derived from the same source-of-truth schemas.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Minimal OpenAPI 3.1 types (no external dependency required)
// ---------------------------------------------------------------------------

type SchemaObject = Record<string, unknown>;

interface PathItem {
  [method: string]: OperationObject;
}

interface OperationObject {
  summary: string;
  tags: string[];
  security?: Array<Record<string, string[]>>;
  requestBody?: {
    required: boolean;
    content: { "application/json": { schema: SchemaObject } };
  };
  parameters?: ParameterObject[];
  responses: Record<string, { description: string; content?: Record<string, { schema: SchemaObject }> }>;
}

interface ParameterObject {
  name: string;
  in: "path" | "query" | "header";
  required: boolean;
  schema: SchemaObject;
}

// ---------------------------------------------------------------------------
// Zod → JSON Schema (subset sufficient for the existing route contracts)
// ---------------------------------------------------------------------------

function zodToJsonSchema(schema: z.ZodTypeAny): SchemaObject {
  if (schema instanceof z.ZodString) return { type: "string" };
  if (schema instanceof z.ZodNumber) return { type: "number" };
  if (schema instanceof z.ZodBoolean) return { type: "boolean" };
  if (schema instanceof z.ZodDate) return { type: "string", format: "date-time" };

  if (schema instanceof z.ZodEnum) {
    return { type: "string", enum: schema.options as string[] };
  }

  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return zodToJsonSchema(schema.unwrap());
  }

  if (schema instanceof z.ZodArray) {
    return { type: "array", items: zodToJsonSchema(schema.element) };
  }

  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as Record<string, z.ZodTypeAny>;
    const properties: Record<string, SchemaObject> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToJsonSchema(value);
      if (!(value instanceof z.ZodOptional) && !(value instanceof z.ZodNullable)) {
        required.push(key);
      }
    }

    return { type: "object", properties, ...(required.length ? { required } : {}) };
  }

  return {};
}

// ---------------------------------------------------------------------------
// Route registration helpers
// ---------------------------------------------------------------------------

interface RouteDefinition {
  method: "get" | "post" | "put" | "patch" | "delete";
  path: string;
  summary: string;
  tag: string;
  auth?: boolean;
  body?: z.ZodObject<z.ZodRawShape>;
  params?: z.ZodObject<z.ZodRawShape>;
  query?: z.ZodObject<z.ZodRawShape>;
  responseSchema?: z.ZodTypeAny;
}

const routes: RouteDefinition[] = [];

export function registerRoute(def: RouteDefinition): void {
  routes.push(def);
}

// ---------------------------------------------------------------------------
// Build the OpenAPI document
// ---------------------------------------------------------------------------

export function buildOpenApiDocument(): Record<string, unknown> {
  const paths: Record<string, PathItem> = {};

  for (const route of routes) {
    // Convert Express :param syntax to OpenAPI {param} syntax
    const openApiPath = route.path.replace(/:([^/]+)/g, "{$1}");

    if (!paths[openApiPath]) paths[openApiPath] = {};

    const operation: OperationObject = {
      summary: route.summary,
      tags: [route.tag],
      responses: {
        "200": {
          description: "Success",
          ...(route.responseSchema
            ? { content: { "application/json": { schema: zodToJsonSchema(route.responseSchema) } } }
            : {}),
        },
        "400": { description: "Validation error" },
        "401": { description: "Unauthorized" },
        "500": { description: "Internal server error" },
      },
    };

    if (route.auth) {
      operation.security = [{ bearerAuth: [] }];
    }

    if (route.body) {
      operation.requestBody = {
        required: true,
        content: { "application/json": { schema: zodToJsonSchema(route.body) } },
      };
    }

    const parameters: ParameterObject[] = [];

    if (route.params) {
      const shape = route.params.shape as Record<string, z.ZodTypeAny>;
      for (const [name, schema] of Object.entries(shape)) {
        parameters.push({ name, in: "path", required: true, schema: zodToJsonSchema(schema) });
      }
    }

    if (route.query) {
      const shape = route.query.shape as Record<string, z.ZodTypeAny>;
      for (const [name, schema] of Object.entries(shape)) {
        const isOptional = schema instanceof z.ZodOptional;
        parameters.push({
          name,
          in: "query",
          required: !isOptional,
          schema: zodToJsonSchema(schema),
        });
      }
    }

    if (parameters.length) operation.parameters = parameters;

    paths[openApiPath][route.method] = operation;
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "LumenHealth API",
      version: "1.0.0",
      description: "Auto-generated from Zod route contracts (CHORD-029)",
    },
    servers: [{ url: "/api/v1", description: "Current environment" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
    paths,
  };
}
