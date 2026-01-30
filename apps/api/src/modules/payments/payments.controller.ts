import { Router, Request, Response } from "express";
import { PaymentIntentService } from "./intent.service";

const router = Router();

/**
 * POST /api/v1/payments/intent
 * Body: { clinicId: string, amount: string }
 */
router.post("/intent", (req: Request, res: Response) => {
  try {
    const { clinicId, amount } = req.body;

    if (!clinicId || !amount) {
      return res.status(400).json({ error: "Missing clinicId or amount" });
    }

    const intent = PaymentIntentService.createIntent(clinicId, amount);

    res.json({
      status: "success",
      data: intent,
    });
  } catch (error: any) {
    console.error("Payment Intent Error:", error);
    res.status(500).json({ error: error.message });
  }
});

export const paymentRoutes = router;