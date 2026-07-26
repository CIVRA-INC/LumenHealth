import { Router } from "express";
import { resolveAuthContext } from "../../../shared/middleware/auth-context.js";
import {
  listDocuments,
  createDocument,
  getDocument,
  deleteDocument,
} from "../controllers/patient-document.controller.js";

const router = Router({ mergeParams: true });

router.get("/", resolveAuthContext, listDocuments);
router.post("/", resolveAuthContext, createDocument);
router.get("/:documentId", resolveAuthContext, getDocument);
router.delete("/:documentId", resolveAuthContext, deleteDocument);

export { router as patientDocumentRouter };
