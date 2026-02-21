import { Request, Response, Router } from "express";
import bcrypt from "bcryptjs";
import { validateRequest } from "../../middlewares/validate.middleware";
import { UserModel } from "./models/user.model";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "./token.service";
import { LoginDto, RefreshDto, loginSchema, refreshSchema } from "./auth.validation";

const router = Router();

type LoginRequest = Request<Record<string, string>, unknown, LoginDto>;
type RefreshRequest = Request<Record<string, string>, unknown, RefreshDto>;
const INVALID_CREDENTIALS = "Invalid email or password";

router.post(
  "/login",
  validateRequest({ body: loginSchema }),
  async (req: LoginRequest, res: Response) => {
    const email = req.body.email.toLowerCase().trim();
    const user = await UserModel.findOne({ email });

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: "Unauthorized",
        message: INVALID_CREDENTIALS,
      });
    }

    const isPasswordValid = await bcrypt.compare(req.body.password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: "Unauthorized",
        message: INVALID_CREDENTIALS,
      });
    }

    const tokenUser = {
      userId: user.id,
      role: user.role,
      clinicId: String(user.clinicId),
    };

    return res.json({
      status: "success",
      data: {
        accessToken: signAccessToken(tokenUser),
        refreshToken: signRefreshToken(tokenUser),
      },
    });
  },
);

router.post(
  "/refresh",
  validateRequest({ body: refreshSchema }),
  async (req: RefreshRequest, res: Response) => {
    const decoded = verifyRefreshToken(req.body.refreshToken);
    if (!decoded) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid refresh token",
      });
    }

    const user = await UserModel.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid refresh token",
      });
    }

    return res.json({
      status: "success",
      data: {
        accessToken: signAccessToken({
          userId: user.id,
          role: user.role,
          clinicId: String(user.clinicId),
        }),
      },
    });
  },
);

export const authRoutes = router;
