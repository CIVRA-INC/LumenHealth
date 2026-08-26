export * from "./auth.js";
export * from "./clinic.js";
export * from "./staff.js";
export * from "./audit.js";
export * from "./hashing.js";
export * from "./merkle.js";
export * from "./signing-keys.js";

export type PaymentIntent = {
  id: string;
  amount: number;
  assetCode: string;
  memo: string;
  status: "pending" | "confirmed" | "failed";
};
