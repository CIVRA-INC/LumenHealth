/**
 * CHORD-029: Route contract registrations for OpenAPI generation.
 *
 * Each call to registerRoute() mirrors an actual Express route and its
 * Zod validation schema so the generated spec stays in sync with runtime
 * enforcement.
 */

import { Router } from "express";
import { loginSchema, refreshSchema } from "../modules/auth/auth.validation";
import { createPatientSchema } from "../modules/patients/patients.validation";
import { createEncounterSchema } from "../modules/encounters/encounters.validation";
import { createVitalsSchema } from "../modules/vitals/vitals.validation";
import { createClinicalNoteSchema } from "../modules/notes/notes.validation";
import { buildOpenApiDocument, registerRoute } from "./openapi.builder";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

registerRoute({
  method: "post",
  path: "/auth/login",
  summary: "Authenticate a clinic user and receive JWT tokens",
  tag: "Auth",
  body: loginSchema,
});

registerRoute({
  method: "post",
  path: "/auth/refresh",
  summary: "Exchange a refresh token for a new access token",
  tag: "Auth",
  body: refreshSchema,
});

// ---------------------------------------------------------------------------
// Patients
// ---------------------------------------------------------------------------

registerRoute({
  method: "post",
  path: "/patients",
  summary: "Register a new patient",
  tag: "Patients",
  auth: true,
  body: createPatientSchema,
});

registerRoute({
  method: "get",
  path: "/patients/:id",
  summary: "Retrieve a patient record",
  tag: "Patients",
  auth: true,
  params: z.object({ id: z.string() }),
});

registerRoute({
  method: "get",
  path: "/patients",
  summary: "Search patients",
  tag: "Patients",
  auth: true,
  query: z.object({ q: z.string().optional(), page: z.string().optional() }),
});

// ---------------------------------------------------------------------------
// Encounters
// ---------------------------------------------------------------------------

registerRoute({
  method: "post",
  path: "/encounters",
  summary: "Open a new clinical encounter",
  tag: "Encounters",
  auth: true,
  body: createEncounterSchema,
});

registerRoute({
  method: "get",
  path: "/encounters/:id",
  summary: "Retrieve an encounter",
  tag: "Encounters",
  auth: true,
  params: z.object({ id: z.string() }),
});

registerRoute({
  method: "get",
  path: "/encounters/patient/:patientId",
  summary: "List all encounters for a patient",
  tag: "Encounters",
  auth: true,
  params: z.object({ patientId: z.string() }),
});

// ---------------------------------------------------------------------------
// Vitals
// ---------------------------------------------------------------------------

registerRoute({
  method: "post",
  path: "/vitals",
  summary: "Record vitals for an encounter",
  tag: "Vitals",
  auth: true,
  body: createVitalsSchema,
});

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

registerRoute({
  method: "post",
  path: "/notes",
  summary: "Add a clinical note to an encounter",
  tag: "Notes",
  auth: true,
  body: createClinicalNoteSchema as unknown as z.ZodObject<z.ZodRawShape>,
});

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

registerRoute({
  method: "post",
  path: "/payments/intent",
  summary: "Generate a Stellar payment intent",
  tag: "Payments",
  auth: true,
  body: z.object({ encounterId: z.string(), amountXlm: z.number() }),
});

registerRoute({
  method: "post",
  path: "/payments/confirm",
  summary: "Confirm an on-chain Stellar transaction",
  tag: "Payments",
  auth: true,
  body: z.object({ intentId: z.string(), txHash: z.string() }),
});

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

registerRoute({
  method: "get",
  path: "/health",
  summary: "API health and feature-flag diagnostics",
  tag: "System",
});

// ---------------------------------------------------------------------------
// Express router — serves the generated spec
// ---------------------------------------------------------------------------

const router = Router();

router.get("/openapi.json", (_req, res) => {
  res.json(buildOpenApiDocument());
});

export const openApiRoutes = router;
