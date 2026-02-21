import { Request, Response, Router } from "express";
import { validateRequest } from "../../middlewares/validate.middleware";
import { CreateUserDto, createUserSchema } from "./users.validation";

const router = Router();

type CreateUserRequest = Request<Record<string, string>, unknown, CreateUserDto>;

router.post(
  "/",
  validateRequest({ body: createUserSchema }),
  (req: CreateUserRequest, res: Response) => {
    res.status(501).json({
      message: "Staff user creation not implemented yet",
      payload: {
        fullName: req.body.fullName,
        email: req.body.email,
        role: req.body.role,
      },
    });
  },
);

export const userRoutes = router;
