import express from "express";
import { authRouter } from "./modules/auth/router.js";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ service: "api", status: "ok", milestone: "auth" });
});

app.use("/api/v1/auth", authRouter);

export { app };
