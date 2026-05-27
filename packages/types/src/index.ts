export type UserRole = "owner" | "admin" | "clinician" | "cashier";

export type AuthSession = {
  userId: string;
  clinicId: string;
  role: UserRole;
  accessToken: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  session: AuthSession;
};

export type PaymentIntent = {
  id: string;
  amount: number;
  assetCode: string;
  memo: string;
  status: "pending" | "confirmed" | "failed";
};
