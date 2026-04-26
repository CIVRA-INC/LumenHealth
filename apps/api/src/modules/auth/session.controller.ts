import { Request, Response, Router } from "express";
import { verifyAccessToken } from "./token.service";

const router = Router();

interface SessionPayload {
  userId: string;
  role: string;
  clinicId: string;
  capabilities: string[];
}

const ROLE_CAPABILITIES: Record<string, string[]> = {
  admin: ["read", "write", "delete", "manage_users"],
  doctor: ["read", "write", "view_patients"],
  nurse: ["read", "view_patients"],
  receptionist: ["read", "schedule"],
};

function getCapabilities(role: string): string[] {
  return ROLE_CAPABILITIES[role] ?? [];
}

// GET /auth/session - returns actor, role claims, and capability flags
router.get("/session", (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized", message: "Missing token" });
  }

  const token = authHeader.slice(7);
  const decoded = verifyAccessToken(token);

  if (!decoded) {
    return res.status(401).json({ error: "Unauthorized", message: "Invalid or expired token" });
  }

  const payload: SessionPayload = {
    userId: decoded.userId,
    role: decoded.role,
    clinicId: decoded.clinicId,
    capabilities: getCapabilities(decoded.role),
  };

  return res.json({ status: "success", data: payload });
});

export const sessionRoutes = router;
