export type AppRole =
  | "SUPER_ADMIN"
  | "CLINIC_ADMIN"
  | "DOCTOR"
  | "NURSE"
  | "ASSISTANT"
  | "READ_ONLY";

export interface AuthenticatedUser {
  userId: string;
  role: AppRole;
  clinicId: string;
}

export interface RequestContext {
  correlationId: string;
  actor: {
    userId: string;
    role: AppRole;
  } | null;
  clinicId: string | null;
  request: {
    method: string;
    path: string;
  };
  subscription: {
    status: "unknown" | "active" | "expired";
  };
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      context?: RequestContext;
    }
  }
}

export {};
