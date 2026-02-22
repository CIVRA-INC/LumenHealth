import { Request, Response, Router } from "express";
import mongoose from "mongoose";
import { validateRequest } from "../../middlewares/validate.middleware";
import { UserModel } from "../auth/models/user.model";
import { signAccessToken, signRefreshToken } from "../auth/token.service";
import { ClinicModel } from "./models/clinic.model";
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
  async (req: RegisterClinicRequest, res: Response) => {
    const session = await mongoose.startSession();

    try {
      let createdClinicId = "";
      let createdAdminUserId = "";

      await session.withTransaction(async () => {
        const clinic = await ClinicModel.create(
          [
            {
              name: req.body.clinicName,
            },
          ],
          { session },
        );

        const clinicDoc = clinic[0];
        const adminUser = new UserModel({
          fullName: `${req.body.clinicName} Admin`,
          email: req.body.adminEmail.toLowerCase().trim(),
          password: req.body.adminPassword,
          role: "CLINIC_ADMIN",
          clinicId: clinicDoc._id,
          isActive: true,
        });

        await adminUser.save({ session });

        createdClinicId = clinicDoc.id;
        createdAdminUserId = adminUser.id;
      });

      if (!createdClinicId || !createdAdminUserId) {
        throw new Error("Clinic registration transaction failed");
      }

      const tokenUser = {
        userId: createdAdminUserId,
        role: "CLINIC_ADMIN" as const,
        clinicId: createdClinicId,
      };

      return res.status(201).json({
        status: "success",
        data: {
          clinicId: createdClinicId,
          accessToken: signAccessToken(tokenUser),
          refreshToken: signRefreshToken(tokenUser),
        },
      });
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000
      ) {
        return res.status(409).json({
          error: "Conflict",
          message: "Unable to complete registration",
        });
      }

      return res.status(500).json({
        error: "InternalServerError",
        message: "Unable to complete registration",
      });
    } finally {
      await session.endSession();
    }
  },
);

export const clinicOnboardingRoutes = router;
