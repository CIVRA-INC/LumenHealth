import { ClinicModel } from "../clinics/models/clinic.model";
import { PaymentRecordDocument, PaymentRecordModel } from "./models/payment-record.model";
import { StellarService } from "./stellar.service";

const SCHEDULE_MS = 2 * 60 * 1000;
const MAX_RETRY_ATTEMPTS = 5;

export const getBackoffMilliseconds = (attempt: number): number => {
  const exponential = Math.min(2 ** Math.max(attempt - 1, 0), 32);
  return exponential * 1000;
};

export const computeExtendedExpiryDate = (
  currentExpiry: Date | null | undefined,
  subscriptionMonths: number,
): Date => {
  const base = currentExpiry && currentExpiry.getTime() > Date.now() ? currentExpiry : new Date();
  const updated = new Date(base);
  updated.setMonth(updated.getMonth() + subscriptionMonths);
  return updated;
};

const isRateLimitedError = (error: unknown): boolean => {
  const statusCode = (error as { response?: { status?: number } })?.response?.status;
  if (statusCode === 429 || statusCode === 503) {
    return true;
  }

  const message = String((error as { message?: string })?.message ?? "").toLowerCase();
  return message.includes("rate limit") || message.includes("too many requests");
};

const verifySinglePaymentRecord = async (
  paymentRecord: PaymentRecordDocument & { _id: unknown },
  stellarService: StellarService,
) => {
  try {
    const verification = await stellarService.verifyPaymentOnChain({
      txHash: paymentRecord.txHash,
      expectedMemo: paymentRecord.memo,
      expectedAmount: paymentRecord.amount,
    });

    if (!verification.isVerified) {
      return;
    }

    const clinic = await ClinicModel.findById(paymentRecord.clinicId)
      .select({ subscriptionExpiryDate: 1 })
      .lean();

    if (!clinic) {
      return;
    }

    const nextExpiry = computeExtendedExpiryDate(
      clinic.subscriptionExpiryDate ? new Date(clinic.subscriptionExpiryDate) : null,
      paymentRecord.subscriptionMonths || 1,
    );

    await Promise.all([
      ClinicModel.findByIdAndUpdate(paymentRecord.clinicId, {
        $set: { subscriptionExpiryDate: nextExpiry },
      }),
      PaymentRecordModel.findByIdAndUpdate(paymentRecord._id, {
        $set: {
          status: "verified",
          verifiedAt: new Date(),
          nextRetryAt: null,
        },
      }),
    ]);
  } catch (error) {
    const nextAttempt = paymentRecord.attempts + 1;
    const exhausted = nextAttempt >= MAX_RETRY_ATTEMPTS;

    const updatePayload = exhausted
      ? {
          status: "failed",
          attempts: nextAttempt,
          nextRetryAt: null,
        }
      : {
          attempts: nextAttempt,
          status: "pending",
          nextRetryAt: isRateLimitedError(error)
            ? new Date(Date.now() + getBackoffMilliseconds(nextAttempt))
            : new Date(Date.now() + 30_000),
        };

    await PaymentRecordModel.findByIdAndUpdate(paymentRecord._id, {
      $set: updatePayload,
    });

    console.error("[payments-worker] verification failed", {
      paymentRecordId: String(paymentRecord._id),
      clinicId: paymentRecord.clinicId,
      error,
    });
  }
};

export const processPendingPayments = async (stellarService = new StellarService()) => {
  const now = new Date();
  const pendingPayments = await PaymentRecordModel.find({
    status: "pending",
    $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: now } }],
  })
    .sort({ createdAt: 1 })
    .limit(100)
    .lean();

  for (const paymentRecord of pendingPayments) {
    await verifySinglePaymentRecord(
      paymentRecord as PaymentRecordDocument & { _id: unknown },
      stellarService,
    );
  }
};

let workerTask: NodeJS.Timeout | null = null;

export const startPaymentVerificationWorker = () => {
  if (workerTask) {
    return workerTask;
  }

  workerTask = setInterval(() => {
    void processPendingPayments().catch((error) => {
      console.error("[payments-worker] scheduled execution failed", error);
    });
  }, SCHEDULE_MS);

  return workerTask;
};

export const stopPaymentVerificationWorker = () => {
  if (workerTask) {
    clearInterval(workerTask);
  }
  workerTask = null;
};
