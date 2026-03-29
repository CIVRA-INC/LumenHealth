import { Request, Response, Router } from "express";
import { authorize, Roles } from "../../middlewares/rbac.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import { AiDraftModel } from "./models/ai-draft.model";
import {
  AiDraftIdParamsDto,
  ApproveAiDraftDto,
  CreateAiDraftDto,
  UpdateAiDraftDto,
  aiDraftIdParamsSchema,
  approveAiDraftSchema,
  createAiDraftSchema,
  updateAiDraftSchema,
} from "./drafts.validation";
import { ClinicalNoteModel } from "../notes/models/clinical-note.model";

const router = Router();
const ALL_ROLES: Roles[] = Object.values(Roles);

type CreateDraftRequest = Request<Record<string, string>, unknown, CreateAiDraftDto>;
type UpdateDraftRequest = Request<AiDraftIdParamsDto, unknown, UpdateAiDraftDto>;
type ApproveDraftRequest = Request<AiDraftIdParamsDto, unknown, ApproveAiDraftDto>;
type DraftByIdRequest = Request<AiDraftIdParamsDto>;
type DraftListRequest = Request<Record<string, string>, unknown, unknown, { encounterId?: string }>;

const toDraftPayload = (doc: {
  _id: unknown;
  encounterId: string;
  authorId: string;
  content: string;
  status: "DRAFT";
  createdAt?: Date;
  updatedAt?: Date;
}) => ({
  id: String(doc._id),
  encounterId: doc.encounterId,
  authorId: doc.authorId,
  content: doc.content,
  status: doc.status,
  createdAt: doc.createdAt?.toISOString() ?? null,
  updatedAt: doc.updatedAt?.toISOString() ?? null,
});

router.post(
  "/drafts",
  authorize(ALL_ROLES),
  validateRequest({ body: createAiDraftSchema }),
  async (req: CreateDraftRequest, res: Response) => {
    const clinicId = req.user?.clinicId;
    const authorId = req.user?.userId;
    if (!clinicId || !authorId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    const created = await AiDraftModel.create({
      clinicId,
      authorId,
      encounterId: req.body.encounterId,
      content: req.body.content,
      status: "DRAFT",
    });

    return res.status(201).json({
      status: "success",
      data: toDraftPayload(created.toObject() as Parameters<typeof toDraftPayload>[0]),
    });
  },
);

router.get(
  "/drafts",
  authorize(ALL_ROLES),
  async (req: DraftListRequest, res: Response) => {
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    const drafts = await AiDraftModel.find({
      clinicId,
      ...(req.query.encounterId ? { encounterId: req.query.encounterId } : {}),
      status: "DRAFT",
    })
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean();

    return res.json({
      status: "success",
      data: drafts.map((draft) => toDraftPayload(draft as Parameters<typeof toDraftPayload>[0])),
    });
  },
);

router.patch(
  "/drafts/:id",
  authorize(ALL_ROLES),
  validateRequest({ params: aiDraftIdParamsSchema, body: updateAiDraftSchema }),
  async (req: UpdateDraftRequest, res: Response) => {
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    const updated = await AiDraftModel.findOneAndUpdate(
      { _id: req.params.id, clinicId, status: "DRAFT" },
      { $set: { content: req.body.content } },
      { new: true },
    ).lean();

    if (!updated) {
      return res.status(404).json({
        error: "NotFound",
        message: "Draft not found",
      });
    }

    return res.json({
      status: "success",
      data: toDraftPayload(updated as Parameters<typeof toDraftPayload>[0]),
    });
  },
);

router.delete(
  "/drafts/:id",
  authorize(ALL_ROLES),
  validateRequest({ params: aiDraftIdParamsSchema }),
  async (req: DraftByIdRequest, res: Response) => {
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    const deleted = await AiDraftModel.findOneAndDelete({
      _id: req.params.id,
      clinicId,
      status: "DRAFT",
    }).lean();

    if (!deleted) {
      return res.status(404).json({
        error: "NotFound",
        message: "Draft not found",
      });
    }

    return res.status(204).send();
  },
);

router.post(
  "/drafts/:id/approve",
  authorize(ALL_ROLES),
  validateRequest({ params: aiDraftIdParamsSchema, body: approveAiDraftSchema }),
  async (req: ApproveDraftRequest, res: Response) => {
    const clinicId = req.user?.clinicId;
    const authorId = req.user?.userId;
    if (!clinicId || !authorId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    const draft = await AiDraftModel.findOne({
      _id: req.params.id,
      clinicId,
      status: "DRAFT",
    }).lean();

    if (!draft) {
      return res.status(404).json({
        error: "NotFound",
        message: "Draft not found",
      });
    }

    const finalizedContent = req.body.content?.trim() || draft.content;

    const note = await ClinicalNoteModel.create({
      clinicId,
      encounterId: draft.encounterId,
      authorId,
      type: "AI_SUMMARY",
      content: finalizedContent,
      timestamp: new Date(),
    });

    await AiDraftModel.deleteOne({ _id: draft._id, clinicId });

    return res.status(201).json({
      status: "success",
      data: {
        noteId: String(note._id),
        encounterId: note.encounterId,
        type: note.type,
        timestamp: note.timestamp.toISOString(),
      },
    });
  },
);

export const aiDraftRoutes = router;
