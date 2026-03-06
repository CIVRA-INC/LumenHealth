import { Router, Request, Response } from "express";
import { PaymentIntentService } from "./intent.service";
import { authorize, Roles } from "../../middlewares/rbac.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import { PaymentRecordModel } from "./models/payment-record.model";
import { ClinicModel } from "../clinics/models/clinic.model";
import {
  CreatePaymentIntentDto,
  PaymentStatusParamsDto,
  createPaymentIntentSchema,
  paymentStatusParamsSchema,
} from "./payments.validation";

const router = Router();
const ALL_ROLES: Roles[] = Object.values(Roles);
type CreateIntentRequest = Request<Record<string, string>, unknown, CreatePaymentIntentDto>;
type PaymentStatusRequest = Request<PaymentStatusParamsDto>;

/**
 * POST /api/v1/payments/intent
 * Body: { clinicId: string, amount: string }
 */
router.post(
  "/intent",
  authorize(ALL_ROLES),
  validateRequest({ body: createPaymentIntentSchema }),
  async (req: CreateIntentRequest, res: Response) => {
    try {
      const { clinicId, amount } = req.body;
      if (clinicId !== req.user?.clinicId && req.user?.role !== Roles.SUPER_ADMIN) {
        return res.status(403).json({
          error: "Forbidden",
          message: "Cannot create payment intent for another clinic",
        });
      }

      const intent = PaymentIntentService.createIntent(clinicId, amount);

      await PaymentRecordModel.create({
        intentId: intent.intentId,
        clinicId,
        amount: intent.amount,
        destination: intent.destination,
        memo: intent.memo,
        status: "pending",
      });

      return res.json({
        status: "success",
        data: intent,
      });
    } catch (error: any) {
      console.error("Payment Intent Error:", error);
      return res.status(500).json({ error: error.message });
    }
  },
);

router.get(
  "/status/:intentId",
  authorize(ALL_ROLES),
  validateRequest({ params: paymentStatusParamsSchema }),
  async (req: PaymentStatusRequest, res: Response) => {
    const record = await PaymentRecordModel.findOne({
      intentId: req.params.intentId,
      clinicId: req.user?.clinicId,
    }).lean();

    if (!record) {
      return res.status(404).json({
        error: "NotFound",
        message: "Payment intent not found",
      });
    }

    const clinic = await ClinicModel.findById(record.clinicId)
      .select({ subscriptionExpiryDate: 1 })
      .lean();

    return res.json({
      status: "success",
      data: {
        intentId: record.intentId,
        paymentStatus: record.status,
        subscriptionExpiryDate: clinic?.subscriptionExpiryDate ?? null,
      },
    });
  },
);

export const paymentRoutes = router;
