import { Request, Response, Router } from "express";
import { validateRequest } from "../../middlewares/validate.middleware";
import {
  ClinicRegistrationDto,
  clinicRegistrationSchema,
} from "./onboarding.validation";

const router = Router();

type RegisterClinicRequest = Request<
  Record<string, string>,
  unknown,
  ClinicRegistrationDto
>;

router.post(
  "/register",
  validateRequest({ body: clinicRegistrationSchema }),
  (req: RegisterClinicRequest, res: Response) => {
    res.status(501).json({
      message: "Clinic registration not implemented yet",
      payload: {
        clinicName: req.body.clinicName,
        adminEmail: req.body.adminEmail,
      },
    });
  },
);

export const clinicOnboardingRoutes = router;
