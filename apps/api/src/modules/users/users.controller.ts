import crypto from "crypto";
import { Request, Response, Router } from "express";
import { authorize, Roles } from "../../middlewares/rbac.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import { UserModel } from "../auth/models/user.model";
import {
  CreateUserDto,
  UserIdParamDto,
  createUserSchema,
  userIdParamSchema,
} from "./users.validation";

const router = Router();
const STAFF_ALLOWED_ROLES: Roles[] = [Roles.CLINIC_ADMIN, Roles.SUPER_ADMIN];

type CreateUserRequest = Request<Record<string, string>, unknown, CreateUserDto>;
type UpdateStatusRequest = Request<UserIdParamDto>;

const createTemporaryPassword = (): string => {
  const random = crypto.randomBytes(8).toString("base64url");
  return `${random}#A1`;
};

router.post(
  "/",
  authorize(STAFF_ALLOWED_ROLES),
  validateRequest({ body: createUserSchema }),
  async (req: CreateUserRequest, res: Response) => {
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    const generatedTemporaryPassword = req.body.password
      ? null
      : createTemporaryPassword();

    const user = new UserModel({
      fullName: req.body.fullName.trim(),
      email: req.body.email.toLowerCase().trim(),
      role: req.body.role,
      clinicId,
      password: req.body.password ?? generatedTemporaryPassword,
      isActive: true,
    });

    await user.save();

    return res.status(201).json({
      status: "success",
      data: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        clinicId: String(user.clinicId),
        generatedTemporaryPassword,
      },
    });
  },
);

router.get("/", authorize(STAFF_ALLOWED_ROLES), async (req: Request, res: Response) => {
  const clinicId = req.user?.clinicId;
  if (!clinicId) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Authentication required",
    });
  }

  const users = await UserModel.find({ clinicId })
    .select("-password")
    .sort({ createdAt: -1 })
    .lean();

  return res.json({
    status: "success",
    data: users,
  });
});

router.patch(
  "/:id/status",
  authorize(STAFF_ALLOWED_ROLES),
  validateRequest({ params: userIdParamSchema }),
  async (req: UpdateStatusRequest, res: Response) => {
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    const updatedUser = await UserModel.findOneAndUpdate(
      { _id: req.params.id, clinicId },
      { $set: { isActive: false } },
      { new: true },
    )
      .select("-password")
      .lean();

    if (!updatedUser) {
      return res.status(404).json({
        error: "NotFound",
        message: "User not found",
      });
    }

    return res.json({
      status: "success",
      data: updatedUser,
    });
  },
);

export const userRoutes = router;
