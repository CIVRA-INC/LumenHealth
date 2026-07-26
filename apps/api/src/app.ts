import express from "express";
import { authRouter } from "./modules/auth/routes/index.js";
import { invitationRouter } from "./modules/staff/routes/index.js";
import { staffRouter } from "./modules/staff/routes/staff.routes.js";
import { clinicRouter } from "./modules/clinic/routes/index.js";
import { auditRouter } from "./modules/audit/routes/index.js";
import { internalAuditRouter } from "./modules/audit/routes/internal.js";
import { patientDemographicsRouter } from "./modules/records/routes/patient-demographics.routes.js";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ service: "api", status: "ok", milestone: "documents-attachments" });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/staff/invitations", invitationRouter);
app.use("/api/v1/staff", staffRouter);
app.use("/api/v1/clinics", clinicRouter);
app.use("/api/v1/audit", auditRouter);
app.use("/api/v1/patients/:patientId/documents", patientDocumentRouter);
app.use("/internal/audit", internalAuditRouter);
app.use("/api/v1/patients", patientIdentityRouter);

export { app };
