import { createRequire } from "node:module";
import express from "express";
import { authRouter } from "./modules/auth/routes/index.js";
import { invitationRouter } from "./modules/staff/routes/index.js";
import { staffRouter } from "./modules/staff/routes/staff.routes.js";
import { clinicRouter } from "./modules/clinic/routes/index.js";
import { auditRouter } from "./modules/audit/routes/index.js";
import { internalAuditRouter } from "./modules/audit/routes/internal.js";

const { version: apiVersion } = createRequire(import.meta.url)("../package.json") as { version: string };

const app = express();

// Export bundles carry many audit entries + Merkle proofs, so this path gets
// a larger body limit than the app-wide default. Must be mounted before the
// general json() parser below — body-parser skips re-parsing a request whose
// body a previous middleware already consumed, so registration order here
// is what makes the larger limit actually take effect for this one route.
app.use("/api/v1/audit/verify-export", express.json({ limit: "5mb" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  // `version` is sourced from the api package.json rather than a hand-maintained
  // milestone label, so it can't go stale as features land (see issue #1033).
  res.json({ service: "api", status: "ok", version: apiVersion });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/staff/invitations", invitationRouter);
app.use("/api/v1/staff", staffRouter);
app.use("/api/v1/clinics", clinicRouter);
app.use("/api/v1/audit", auditRouter);
app.use("/internal/audit", internalAuditRouter);

export { app };
