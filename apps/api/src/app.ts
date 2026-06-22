import express from "express";
import { authRouter } from "./modules/auth/routes/index.js";
import { invitationRouter } from "./modules/staff/routes/index.js";
import { clinicRouter } from "./modules/clinic/routes/index.js";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ service: "api", status: "ok", milestone: "staff-invitations" });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/staff/invitations", invitationRouter);
app.use("/api/v1/clinics", clinicRouter);

export { app };
