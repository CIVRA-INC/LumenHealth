import express from "express";
import { authRouter } from "./modules/auth/routes/index.js";
import { clinicRouter } from "./modules/clinic/routes/index.js";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ service: "api", status: "ok", milestone: "clinic" });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/clinics", clinicRouter);

export { app };
