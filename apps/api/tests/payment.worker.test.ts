import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  computeExtendedExpiryDate,
  getBackoffMilliseconds,
  processPendingPayments,
} from "../src/modules/payments/worker";
import { PaymentRecordModel } from "../src/modules/payments/models/payment-record.model";
import { ClinicModel } from "../src/modules/clinics/models/clinic.model";

vi.mock("../src/modules/payments/models/payment-record.model", () => ({
  PaymentRecordModel: {
    find: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

vi.mock("../src/modules/clinics/models/clinic.model", () => ({
  ClinicModel: {
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

const mockedPaymentFind = vi.mocked(PaymentRecordModel.find);
const mockedPaymentUpdate = vi.mocked(PaymentRecordModel.findByIdAndUpdate);
const mockedClinicFindById = vi.mocked(ClinicModel.findById);

describe("payments worker helpers", () => {
  it("uses exponential backoff capped at 32 seconds", () => {
    expect(getBackoffMilliseconds(1)).toBe(1000);
    expect(getBackoffMilliseconds(2)).toBe(2000);
    expect(getBackoffMilliseconds(8)).toBe(32000);
  });

  it("extends from current active expiry when present", () => {
    const current = new Date("2026-03-10T00:00:00.000Z");
    const extended = computeExtendedExpiryDate(current, 1);
    expect(extended.toISOString()).toBe("2026-04-10T00:00:00.000Z");
  });
});

describe("processPendingPayments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("schedules retry with backoff when stellar verification is rate-limited", async () => {
    mockedPaymentFind.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            {
              _id: "pay_1",
              clinicId: "clinic_1",
              amount: "100",
              memo: "memo_1",
              status: "pending",
              attempts: 1,
              subscriptionMonths: 1,
            },
          ]),
        }),
      }),
    } as never);

    mockedClinicFindById.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          subscriptionExpiryDate: new Date("2026-03-01T00:00:00.000Z"),
        }),
      }),
    } as never);

    const stellarService = {
      verifyPaymentOnChain: vi
        .fn()
        .mockRejectedValue(new Error("rate limit exceeded from horizon")),
    };

    await processPendingPayments(stellarService as never);

    expect(mockedPaymentUpdate).toHaveBeenCalledWith(
      "pay_1",
      expect.objectContaining({
        $set: expect.objectContaining({
          attempts: 2,
          nextRetryAt: expect.any(Date),
        }),
      }),
    );
  });
});
