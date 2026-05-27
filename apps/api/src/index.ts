import express from "express";
import { serverConfig } from "@lumen/config";
import type { LoginRequest, LoginResponse } from "@lumen/types";

const app = express();

app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({
    service: "api",
    status: "ok",
    milestone: "reset-baseline",
  });
});

app.post("/api/v1/auth/login", (request, response) => {
  const body = request.body as Partial<LoginRequest>;

  if (!body.email || !body.password) {
    response.status(400).json({
      error: "email and password are required",
    });
    return;
  }

  const payload: LoginResponse = {
    session: {
      userId: "starter-user",
      clinicId: "starter-clinic",
      role: "owner",
      accessToken: "replace-in-milestone-1",
    },
  };

  response.json(payload);
});

app.get("/api/v1/auth/roadmap", (_request, response) => {
  response.json({
    next: [
      "registration",
      "session persistence",
      "role-based access control",
      "password reset",
      "audit logging",
    ],
  });
});

app.listen(serverConfig.apiPort, () => {
  console.log(`LumenHealth API running on http://localhost:${serverConfig.apiPort}`);
});
