import type { Response } from "express";

export function unauthorized(res: Response, message = "unauthorized") {
  return res.status(401).json({ error: "AUTH_TOKEN_INVALID", message });
}

export function forbidden(res: Response, message = "forbidden") {
  return res.status(403).json({ error: "AUTH_FORBIDDEN", message });
}
