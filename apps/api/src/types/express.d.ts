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

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
