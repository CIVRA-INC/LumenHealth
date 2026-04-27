/**
 * API contracts and route handlers for patient registration and search.
 * Validates input before business logic runs; returns problem responses on failure.
 */

import { Request, Response, Router } from "express";
import { z } from "zod";
import { notFoundProblem, unauthorizedProblem } from "../../core/problem";
import { authorize, Roles } from "../../middlewares/rbac.middleware";
import { getRequestContext } from "../../middlewares/request-context.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import { registerPatient, findPatients, getPatient } from "./patient.service";

// ---------------------------------------------------------------------------
// Zod contracts
// ---------------------------------------------------------------------------

const registerBody = z.object({
  firstName:     z.string().trim().min(1).max(100),
  lastName:      z.string().trim().min(1).max(100),
  dateOfBirth:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
  sex:           z.enum(["M", "F", "O"]),
  contactNumber: z.string().trim().min(1).max(30),
  address:       z.string().trim().min(1).max(300),
});

const searchQuery = z.object({
  q:     z.string().trim().min(1),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

const idParams = z.object({ id: z.string().trim().min(1) });

type RegisterBody  = z.infer<typeof registerBody>;
type SearchQuery   = z.infer<typeof searchQuery>;
type IdParams      = z.infer<typeof idParams>;

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();
const ALL_ROLES: Roles[] = Object.values(Roles);

router.post(
  "/",
  authorize(ALL_ROLES),
  validateRequest({ body: registerBody }),
  async (req: Request<Record<string, string>, unknown, RegisterBody>, res: Response) => {
    const { clinicId, userId } = getRequestContext(req);
    if (!clinicId) throw unauthorizedProblem();

    const patient = await registerPatient({ ...req.body, clinicId, actorId: userId ?? "system" });
    return res.status(201).json({ status: "success", data: patient });
  },
);

router.get(
  "/search",
  authorize(ALL_ROLES),
  validateRequest({ query: searchQuery }),
  async (req: Request<Record<string, string>, unknown, unknown, SearchQuery>, res: Response) => {
    const { clinicId } = getRequestContext(req);
    if (!clinicId) throw unauthorizedProblem();

    const results = await findPatients({ query: req.query.q, clinicId, limit: req.query.limit });
    return res.json({ status: "success", data: results });
  },
);

router.get(
  "/:id",
  authorize(ALL_ROLES),
  validateRequest({ params: idParams }),
  async (req: Request<IdParams>, res: Response) => {
    const { clinicId } = getRequestContext(req);
    if (!clinicId) throw unauthorizedProblem();

    const patient = await getPatient(req.params.id, clinicId);
    if (!patient) throw notFoundProblem("Patient not found");

    return res.json({ status: "success", data: patient });
  },
);

export const patientRegistrationRoutes = router;
