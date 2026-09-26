import express from "express";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ service: "api", status: "ok", milestone: "staff-invitations" });
});

// All API routes have been fully ported to NestJS!
// NestJS automatically handles the `/api/v1` global prefix and module routing.

export { app };
