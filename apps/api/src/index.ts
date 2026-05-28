import express from "express";
import { serverConfig } from "@lumen/config";
import { authRouter } from "./auth/router.js";

const app = express();

app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({
    service: "api",
    status: "ok",
    milestone: "reset-baseline",
  });
});

app.use("/api/v1/auth", authRouter);

app.listen(serverConfig.apiPort, () => {
  console.log(`LumenHealth API running on http://localhost:${serverConfig.apiPort}`);
});
