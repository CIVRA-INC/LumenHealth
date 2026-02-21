import { Request, Response, Router } from "express";
import {
  requireAuthenticatedUser,
  requireRole,
} from "../../middlewares/auth-context.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import { ClinicModel } from "./models/clinic.model";
import { UpdateClinicDto, updateClinicSchema } from "./settings.validation";

const router = Router();

type UpdateClinicRequest = Request<Record<string, string>, unknown, UpdateClinicDto>;

router.get("/me", requireAuthenticatedUser, async (req: Request, res: Response) => {
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

router.patch(
  "/me",
  requireAuthenticatedUser,
  requireRole(["CLINIC_ADMIN"]),
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
