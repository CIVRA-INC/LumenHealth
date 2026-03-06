import { Request, Response, Router } from "express";
import crypto from "crypto";
import { validateRequest } from "../../middlewares/validate.middleware";
import { UserModel } from "./models/user.model";
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./auth.validation";
import { passwordResetEmailService } from "./reset.email";

const router = Router();

type ForgotPasswordRequest = Request<Record<string, string>, unknown, ForgotPasswordDto>;
type ResetPasswordRequest = Request<Record<string, string>, unknown, ResetPasswordDto>;

const GENERIC_FORGOT_PASSWORD_MESSAGE =
  "If the account exists, a reset link has been sent to the email.";

const hashResetToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");

router.post(
  "/forgot-password",
  validateRequest({ body: forgotPasswordSchema }),
  async (req: ForgotPasswordRequest, res: Response) => {
    const email = req.body.email.toLowerCase().trim();

    const user = await UserModel.findOne({ email, isActive: true });
    if (!user) {
      return res.json({
        status: "success",
        message: GENERIC_FORGOT_PASSWORD_MESSAGE,
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordTokenHash = hashResetToken(resetToken);
    user.resetPasswordExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await user.save();
    await passwordResetEmailService.sendPasswordResetEmail(email, resetToken);

    return res.json({
      status: "success",
      message: GENERIC_FORGOT_PASSWORD_MESSAGE,
    });
  },
);

router.post(
  "/reset-password",
  validateRequest({ body: resetPasswordSchema }),
  async (req: ResetPasswordRequest, res: Response) => {
    const tokenHash = hashResetToken(req.body.token);

    const user = await UserModel.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpiresAt: { $gt: new Date() },
      isActive: true,
    });

    if (!user) {
      return res.status(400).json({
        error: "BadRequest",
        message: "Invalid or expired reset token",
      });
    }

    user.password = req.body.newPassword;
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpiresAt = undefined;

    await user.save();

    return res.json({
      status: "success",
      message: "Password has been reset successfully",
    });
  },
);

export const resetRoutes = router;
