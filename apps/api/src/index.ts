import express from "express";
import { serverConfig } from "@lumen/config";
import type { LoginRequest, LoginResponse } from "@lumen/types";
import { sessionExpirationMiddleware, requireAuth, requireRole } from "./middleware/session";
import { createSession, deleteSession, refreshSession } from "./services/session";

const app = express();

app.use(express.json());

// Apply session expiration middleware to all API routes
app.use("/api/v1", sessionExpirationMiddleware);

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

  // TODO: Validate credentials against database
  // TODO: Rate limiting
  // TODO: Brute-force protection

  const session = createSession(
    "starter-user",
    "starter-clinic",
    "owner",
    request.ip || "unknown",
    request.headers["user-agent"] || "unknown"
  );

  const payload: LoginResponse = {
    session: {
      userId: session.userId,
      clinicId: session.clinicId,
      role: session.role,
      accessToken: session.accessToken,
    },
  };

  response.json(payload);
});

app.post("/api/v1/auth/logout", requireAuth, (request, response) => {
  const session = (request as any).session;
  
  if (session) {
    deleteSession(session.id);
  }

  response.json({ message: "Logged out successfully" });
});

app.post("/api/v1/auth/refresh", (request, response) => {
  const { refreshToken } = request.body;

  if (!refreshToken) {
    response.status(400).json({
      error: "refreshToken is required",
    });
    return;
  }

  const result = refreshSession(refreshToken);

  if (!result) {
    response.status(401).json({
      error: "Invalid or expired refresh token",
      code: "INVALID_REFRESH_TOKEN",
    });
    return;
  }

  response.json({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
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

// Example protected route
app.get("/api/v1/admin/dashboard", 
  requireAuth, 
  requireRole("owner", "admin"),
  (_request, response) => {
    response.json({
      message: "Admin dashboard",
      stats: {
        users: 42,
        patients: 1337,
        revenue: "$12,345",
      },
    });
  }
);

app.listen(serverConfig.apiPort, () => {
  console.log(`LumenHealth API running on http://localhost:${serverConfig.apiPort}`);
});
