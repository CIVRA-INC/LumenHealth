export * from "./auth.js";

export type PaymentIntent = {
  id: string;
  amount: number;
  assetCode: string;
  memo: string;
  status: "pending" | "confirmed" | "failed";
};
