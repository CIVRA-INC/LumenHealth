import { Request, Response, Router } from "express";
import { validateRequest } from "../../middlewares/validate.middleware";
import { LoginDto, loginSchema } from "./auth.validation";

const router = Router();

type LoginRequest = Request<Record<string, string>, unknown, LoginDto>;

router.post(
  "/login",
  validateRequest({ body: loginSchema }),
  (req: LoginRequest, res: Response) => {
    res.status(501).json({
      message: "Auth login not implemented yet",
      payload: {
        email: req.body.email,
      },
    });
  },
);

export const authRoutes = router;
