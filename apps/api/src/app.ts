import express from "express";

const app = express();

app.use(express.json());

// `GET /health` now lives in `src/shared/health/health.controller.ts`. It is
// deliberately NOT mounted on this raw Express instance: Nest owns the route,
// and the Express adapter is layered on top of this app during bootstrap, so
// a handler registered here would shadow the controller.

// All API routes have been fully ported to NestJS!
// NestJS automatically handles the `/api/v1` global prefix and module routing.

export { app };
