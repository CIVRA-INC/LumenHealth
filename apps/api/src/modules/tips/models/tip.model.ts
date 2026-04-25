import { Schema, Types, model, models } from 'mongoose';

// ── TipIntent ──────────────────────────────────────────────────────────────────
// Represents the fan's declared intent to tip before the blockchain submission.
// Created client-side; transitions to a TipTransaction once submitted.

export type TipIntentStatus = 'pending' | 'submitted' | 'expired' | 'cancelled';

export interface TipIntentDocument {
  fanId: Types.ObjectId;
  artistId: Types.ObjectId;
  sessionId: Types.ObjectId;
  amountXlm: string;
  /** Idempotency key supplied by the client */
  idempotencyKey: string;
  status: TipIntentStatus;
  /** Set when the intent is promoted to a TipTransaction */
  transactionId?: Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const tipIntentSchema = new Schema<TipIntentDocument>(
  {
    fanId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    artistId: { type: Schema.Types.ObjectId, ref: 'ArtistProfile', required: true, index: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true, index: true },
    amountXlm: { type: String, required: true },
    idempotencyKey: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'submitted', 'expired', 'cancelled'],
      default: 'pending',
      index: true,
    },
    transactionId: { type: Schema.Types.ObjectId, ref: 'TipTransaction' },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

// Replay-safety: fan + session + idempotency key
tipIntentSchema.index({ fanId: 1, sessionId: 1, status: 1 });
// Expiry sweep job
tipIntentSchema.index({ status: 1, expiresAt: 1 });

export const TipIntentModel =
  models.TipIntent || model<TipIntentDocument>('TipIntent', tipIntentSchema);

// ── TipTransaction ─────────────────────────────────────────────────────────────
// Represents the settled on-chain state after Stellar submission.

export type TipTransactionStatus = 'pending' | 'confirmed' | 'failed';

export interface TipTransactionDocument {
  intentId: Types.ObjectId;
  fanId: Types.ObjectId;
  artistId: Types.ObjectId;
  sessionId: Types.ObjectId;
  amountXlm: string;
  /** Stellar transaction hash — set once confirmed */
  txHash?: string;
  status: TipTransactionStatus;
  /** Number of submission attempts */
  attempts: number;
  nextRetryAt?: Date | null;
  confirmedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const tipTransactionSchema = new Schema<TipTransactionDocument>(
  {
    intentId: { type: Schema.Types.ObjectId, ref: 'TipIntent', required: true, unique: true, index: true },
    fanId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    artistId: { type: Schema.Types.ObjectId, ref: 'ArtistProfile', required: true, index: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true, index: true },
    amountXlm: { type: String, required: true },
    txHash: { type: String, trim: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'failed'],
      default: 'pending',
      index: true,
    },
    attempts: { type: Number, default: 0, min: 0 },
    nextRetryAt: { type: Date, default: null },
    confirmedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

// Retry worker: pending transactions due for retry
tipTransactionSchema.index({ status: 1, nextRetryAt: 1 });
// Artist earnings history
tipTransactionSchema.index({ artistId: 1, status: 1, createdAt: -1 });
// Fan tip history
tipTransactionSchema.index({ fanId: 1, createdAt: -1 });

export const TipTransactionModel =
  models.TipTransaction ||
  model<TipTransactionDocument>('TipTransaction', tipTransactionSchema);
