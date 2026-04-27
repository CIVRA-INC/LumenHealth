// Issue #419 – Access Policies and Auditability: API contracts and handlers
import { Request, Response, Router } from "express";
import { z } from "zod";
import { authorize, Roles } from "../../middlewares/rbac.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import { createPolicy, evaluateAccess, listPolicies, transitionPolicy } from "./access-policy.service";

const router = Router();

const createSchema = z.object({
  subjectId: z.string().min(1),
  resource:  z.string().min(1),
  actions:   z.array(z.string()).min(1),
  effect:    z.enum(["ALLOW", "DENY"]),
  expiresAt: z.string().datetime().optional(),
});

const transitionSchema = z.object({ transition: z.enum(["revoke", "expire"]) });

const evaluateSchema = z.object({
  subjectId: z.string().min(1),
  resource:  z.string().min(1),
  action:    z.string().min(1),
});

router.get(
  "/",
  authorize([Roles.CLINIC_ADMIN, Roles.SUPER_ADMIN]),
  async (req: Request, res: Response) => {
    const clinicId = req.user?.clinicId;
    if (!clinicId) return res.status(401).json({ error: "Unauthorized" });
    const policies = await listPolicies(clinicId, req.query.subjectId as string | undefined);
    return res.json({ status: "success", data: policies });
  },
);

router.post(
  "/",
  authorize([Roles.CLINIC_ADMIN, Roles.SUPER_ADMIN]),
  validateRequest({ body: createSchema }),
  async (req: Request, res: Response) => {
    const clinicId = req.user?.clinicId;
    const actorId  = req.user?.userId;
    if (!clinicId || !actorId) return res.status(401).json({ error: "Unauthorized" });
    const policy = await createPolicy({ clinicId, actorId, ...req.body });
    return res.status(201).json({ status: "success", data: policy });
  },
);

router.patch(
  "/:id/transition",
  authorize([Roles.CLINIC_ADMIN, Roles.SUPER_ADMIN]),
  validateRequest({ body: transitionSchema }),
  async (req: Request, res: Response) => {
    const clinicId = req.user?.clinicId;
    if (!clinicId) return res.status(401).json({ error: "Unauthorized" });
    const updated = await transitionPolicy(req.params.id, clinicId, req.body.transition);
    return res.json({ status: "success", data: updated });
  },
);

router.post(
  "/evaluate",
  authorize([Roles.CLINIC_ADMIN, Roles.SUPER_ADMIN, Roles.DOCTOR, Roles.NURSE]),
  validateRequest({ body: evaluateSchema }),
  async (req: Request, res: Response) => {
    const clinicId = req.user?.clinicId;
    if (!clinicId) return res.status(401).json({ error: "Unauthorized" });
    const result = await evaluateAccess(clinicId, req.body.subjectId, req.body.resource, req.body.action);
    return res.json({ status: "success", data: result });
  },
);

export const accessPolicyRoutes = router;
