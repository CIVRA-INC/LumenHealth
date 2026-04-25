import bcrypt from "bcryptjs";
import { Request, Response, Router } from "express";
import { unauthorizedProblem } from "../../core/problem";
import { getRequestContext } from "../../middlewares/request-context.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import {
  LoginDto,
  RefreshDto,
  loginSchema,
  refreshSchema,
} from "./auth.validation";
import { UserModel } from "./models/user.model";
import { resetRoutes } from "./reset.controller";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "./token.service";

const router = Router();

type LoginRequest = Request<Record<string, string>, unknown, LoginDto>;
type RefreshRequest = Request<Record<string, string>, unknown, RefreshDto>;

const INVALID_CREDENTIALS = "Invalid email or password";

router.post(
  "/login",
  validateRequest({ body: loginSchema }),
  async (req: LoginRequest, res: Response) => {
    getRequestContext(req);
    const email = req.body.email.toLowerCase().trim();
    const user = await UserModel.findOne({ email });

    if (!user || !user.isActive) {
      throw unauthorizedProblem(INVALID_CREDENTIALS);
    }

    const isPasswordValid = await bcrypt.compare(req.body.password, user.password);
    if (!isPasswordValid) {
      throw unauthorizedProblem(INVALID_CREDENTIALS);
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
    getRequestContext(req);
    const decoded = verifyRefreshToken(req.body.refreshToken);
    if (!decoded) {
      throw unauthorizedProblem("Invalid refresh token");
    }

    const user = await UserModel.findById(decoded.userId);
    if (!user || !user.isActive) {
      throw unauthorizedProblem("Invalid refresh token");
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

router.use(resetRoutes);

export const authRoutes = router;
