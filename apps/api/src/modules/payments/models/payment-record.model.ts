import { model, Schema } from "mongoose";

export type PaymentStatus = "pending" | "verified" | "failed";

export interface PaymentRecordDocument {
  clinicId: string;
  amount: string;
  memo: string;
  txHash?: string;
  status: PaymentStatus;
  subscriptionMonths: number;
  attempts: number;
  nextRetryAt?: Date | null;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentRecordSchema = new Schema<PaymentRecordDocument>(
  {
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
    memo: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    txHash: {
      type: String,
      required: false,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "verified", "failed"],
      default: "pending",
      index: true,
    },
    subscriptionMonths: {
      type: Number,
      default: 1,
      min: 1,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    nextRetryAt: {
      type: Date,
      required: false,
      default: null,
    },
    verifiedAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

paymentRecordSchema.index({ status: 1, nextRetryAt: 1, updatedAt: 1 });

export const PaymentRecordModel = model<PaymentRecordDocument>(
  "PaymentRecord",
  paymentRecordSchema,
);
