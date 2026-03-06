import { model, models, Schema } from "mongoose";

export type PaymentStatus = "pending" | "verified" | "failed";

export interface PaymentRecordDocument {
  intentId: string;
  clinicId: string;
  amount: string;
  destination: string;
  memo: string;
  txHash?: string;
  status: PaymentStatus;
  subscriptionMonths: number;
  attempts: number;
  nextRetryAt?: Date | null;
  verifiedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const paymentRecordSchema = new Schema<PaymentRecordDocument>(
  {
    intentId: { type: String, required: true, unique: true, index: true },
    clinicId: { type: String, required: true, index: true },
    amount: { type: String, required: true },
    destination: { type: String, required: true },
    memo: { type: String, required: true, index: true },
    txHash: { type: String, required: false },
    status: {
      type: String,
      enum: ["pending", "verified", "failed"],
      default: "pending",
      index: true,
    },
    subscriptionMonths: { type: Number, default: 1, min: 1 },
    attempts: { type: Number, default: 0, min: 0 },
    nextRetryAt: { type: Date, default: null },
    verifiedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

paymentRecordSchema.index({ status: 1, nextRetryAt: 1, updatedAt: 1 });

export const PaymentRecordModel =
  models.PaymentRecord || model<PaymentRecordDocument>("PaymentRecord", paymentRecordSchema);
