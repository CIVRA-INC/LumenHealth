import type { Request, Response } from "express";
import type { PatientDocument, DocumentCategory } from "@qyou/shared";
import { InMemoryDocumentRepository } from "../repositories/in-memory-document.repository.js";

const repository = new InMemoryDocumentRepository();

export async function listDocuments(req: Request, res: Response) {
  const { patientId } = req.params;
  const clinicId = req.auth?.clinicId;

  if (!clinicId) {
    res.status(401).json({ error: "AUTH_TOKEN_INVALID", message: "clinic scope required" });
    return;
  }

  const documents = await repository.listByPatient(patientId, clinicId);
  res.json({ documents, total: documents.length });
}

export async function createDocument(req: Request, res: Response) {
  const { patientId } = req.params;
  const clinicId = req.auth?.clinicId;

  if (!clinicId) {
    res.status(401).json({ error: "AUTH_TOKEN_INVALID", message: "clinic scope required" });
    return;
  }

  const { title, category, attachment, notes } = req.body as {
    title?: string;
    category?: DocumentCategory;
    attachment?: { fileName: string; fileSizeBytes: number; mimeType: string; checksum: string };
    notes?: string;
  };

  if (!title || !category || !attachment) {
    res.status(400).json({ error: "VALIDATION_ERROR", message: "title, category, and attachment are required" });
    return;
  }

  const document: PatientDocument = {
    id: `doc_${Date.now()}`,
    patientId,
    title,
    category,
    attachment,
    uploadedAt: new Date().toISOString(),
    notes,
  };

  const created = await repository.createDocument(document);
  res.status(201).json({ document: created });
}

export async function getDocument(req: Request, res: Response) {
  const { patientId, documentId } = req.params;
  const clinicId = req.auth?.clinicId;

  if (!clinicId) {
    res.status(401).json({ error: "AUTH_TOKEN_INVALID", message: "clinic scope required" });
    return;
  }

  const document = await repository.findById(patientId, documentId);
  if (!document) {
    res.status(404).json({ error: "NOT_FOUND", message: "document not found" });
    return;
  }

  res.json({ document });
}

export async function deleteDocument(req: Request, res: Response) {
  const { patientId, documentId } = req.params;
  const clinicId = req.auth?.clinicId;

  if (!clinicId) {
    res.status(401).json({ error: "AUTH_TOKEN_INVALID", message: "clinic scope required" });
    return;
  }

  const deleted = await repository.deleteDocument(patientId, documentId);
  if (!deleted) {
    res.status(404).json({ error: "NOT_FOUND", message: "document not found" });
    return;
  }

  res.status(204).send();
}
