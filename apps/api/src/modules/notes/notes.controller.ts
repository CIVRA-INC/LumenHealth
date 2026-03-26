import { Request, Response, Router } from "express";
import { authorize, Roles } from "../../middlewares/rbac.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import { findClinicEncounter } from "../clinics/ownership.service";
import { ClinicalNoteModel } from "./models/clinical-note.model";
import {
  CreateClinicalNoteDto,
  EncounterNotesParamsDto,
  NoteIdParamsDto,
  createClinicalNoteSchema,
  encounterNotesParamsSchema,
  noteIdParamsSchema,
} from "./notes.validation";

const router = Router();
const ALL_ROLES: Roles[] = Object.values(Roles);

type CreateClinicalNoteRequest = Request<Record<string, string>, unknown, CreateClinicalNoteDto>;
type EncounterNotesRequest = Request<EncounterNotesParamsDto>;
type NoteByIdRequest = Request<NoteIdParamsDto>;

const toPayload = (doc: {
  _id: unknown;
  encounterId: string;
  authorId: string;
  type: "SOAP" | "FREE_TEXT" | "AI_SUMMARY" | "CORRECTION";
  content: string;
  timestamp: Date;
  correctionOfNoteId?: string;
}) => ({
  id: String(doc._id),
  encounterId: doc.encounterId,
  authorId: doc.authorId,
  type: doc.type,
  content: doc.content,
  timestamp: doc.timestamp.toISOString(),
  correctionOfNoteId: doc.correctionOfNoteId,
});

router.post(
  "/",
  authorize(ALL_ROLES),
  validateRequest({ body: createClinicalNoteSchema }),
  async (req: CreateClinicalNoteRequest, res: Response) => {
    const clinicId = req.user?.clinicId;
    const authorId = req.user?.userId;

    if (!clinicId || !authorId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    const encounterId = req.body.encounterId ?? "mock-enc-123";
    if (req.body.encounterId) {
      const encounter = await findClinicEncounter(clinicId, req.body.encounterId);
      if (!encounter) {
        return res.status(404).json({
          error: "NotFound",
          message: "Encounter not found",
        });
      }
    }

    if (req.body.type === "CORRECTION") {
      const original = await ClinicalNoteModel.findOne({
        _id: req.body.correctionOfNoteId,
        clinicId,
        encounterId,
      })
        .select({ _id: 1, type: 1 })
        .lean();

      if (!original) {
        return res.status(400).json({
          error: "BadRequest",
          message: "Original note for correction was not found",
        });
      }

      if (original.type === "CORRECTION") {
        return res.status(400).json({
          error: "BadRequest",
          message: "Correction notes cannot target other correction notes",
        });
      }
    }

    const created = await ClinicalNoteModel.create({
      encounterId,
      authorId,
      clinicId,
      type: req.body.type,
      content: req.body.content,
      correctionOfNoteId: req.body.correctionOfNoteId,
      timestamp: new Date(),
    });

    return res.status(201).json({
      status: "success",
      data: toPayload(created.toObject() as Parameters<typeof toPayload>[0]),
    });
  },
);

router.get(
  "/encounter/:encounterId",
  authorize(ALL_ROLES),
  validateRequest({ params: encounterNotesParamsSchema }),
  async (req: EncounterNotesRequest, res: Response) => {
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    const notes = await ClinicalNoteModel.find({
      clinicId,
      encounterId: req.params.encounterId,
    })
      .sort({ timestamp: 1 })
      .lean();

    return res.json({
      status: "success",
      data: notes.map((note) => toPayload(note as Parameters<typeof toPayload>[0])),
    });
  },
);

const methodNotAllowed = (_req: NoteByIdRequest, res: Response) => {
  return res.status(405).json({
    error: "MethodNotAllowed",
    message: "Clinical notes are append-only. Use POST to add correction notes.",
  });
};

router.patch(
  "/:id",
  authorize(ALL_ROLES),
  validateRequest({ params: noteIdParamsSchema }),
  methodNotAllowed,
);

router.delete(
  "/:id",
  authorize(ALL_ROLES),
  validateRequest({ params: noteIdParamsSchema }),
  methodNotAllowed,
);

export const notesRoutes = router;
