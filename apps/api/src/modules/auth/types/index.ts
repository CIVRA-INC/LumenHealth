import type { UserRole } from "@lumen/types";

export type AccountStatus = "pending" | "active" | "suspended" | "locked";

export type AuthIdentity = {
  userId: string;
  clinicId: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: AccountStatus;
  createdAt: string;
};
