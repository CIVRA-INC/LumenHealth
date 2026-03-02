import { model, Schema, models } from "mongoose";

export type PaymentStatus = "pending" | "verified" | "failed";

export interface PaymentRecord {
  intentId: string;
  clinicId: string;
  amount: string;
  destination: string;
  memo: string;
  status: PaymentStatus;
  txHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentRecordSchema = new Schema<PaymentRecord>(
  {
    intentId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    clinicId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    amount: {
      type: String,
      required: true,
      trim: true,
    },
    destination: {
      type: String,
      required: true,
      trim: true,
    },
    memo: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "verified", "failed"],
      default: "pending",
      index: true,
    },
    txHash: {
      type: String,
      required: false,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const PaymentRecordModel =
  models.PaymentRecord || model<PaymentRecord>("PaymentRecord", paymentRecordSchema);
