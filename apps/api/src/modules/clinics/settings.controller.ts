import { Request, Response, Router } from "express";
import { authorize, Roles } from "../../middlewares/rbac.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import { ClinicModel } from "./models/clinic.model";
import { UpdateClinicDto, updateClinicSchema } from "./settings.validation";

const router = Router();
const ALL_ROLES: Roles[] = Object.values(Roles);

type UpdateClinicRequest = Request<Record<string, string>, unknown, UpdateClinicDto>;

router.get("/me", authorize(ALL_ROLES), async (req: Request, res: Response) => {
  const clinicId = req.user?.clinicId;

  if (!clinicId) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Authentication required",
    });
  }

  const clinic = await ClinicModel.findById(clinicId).lean();

  if (!clinic) {
    return res.status(404).json({
      error: "NotFound",
      message: "Clinic not found",
    });
  }

  return res.json({
    status: "success",
    data: clinic,
  });
});

router.get("/me/subscription", authorize(ALL_ROLES), async (req: Request, res: Response) => {
  const clinicId = req.user?.clinicId;

  if (!clinicId) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Authentication required",
    });
  }

  const clinic = await ClinicModel.findById(clinicId)
    .select({ subscriptionExpiryDate: 1 })
    .lean();

  if (!clinic) {
    return res.status(404).json({
      error: "NotFound",
      message: "Clinic not found",
    });
  }

  const expiryDate = clinic.subscriptionExpiryDate ?? null;
  const daysRemaining = expiryDate
    ? Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    : null;

  return res.json({
    status: "success",
    data: {
      expiryDate,
      daysRemaining,
      isExpired: daysRemaining !== null ? daysRemaining < 0 : false,
      isWriteLocked: daysRemaining !== null ? daysRemaining < 0 : false,
    },
  });
});

router.patch(
  "/me",
  authorize([Roles.CLINIC_ADMIN]),
  validateRequest({ body: updateClinicSchema }),
  async (req: UpdateClinicRequest, res: Response) => {
    const clinicId = req.user?.clinicId;

    if (!clinicId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    const updatedClinic = await ClinicModel.findByIdAndUpdate(
      clinicId,
      {
        $set: req.body,
      },
      {
        new: true,
        runValidators: true,
      },
    ).lean();

    if (!updatedClinic) {
      return res.status(404).json({
        error: "NotFound",
        message: "Clinic not found",
      });
    }

    return res.json({
      status: "success",
      data: updatedClinic,
    });
  },
);

export const clinicSettingsRoutes = router;
