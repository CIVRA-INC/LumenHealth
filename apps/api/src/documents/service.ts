import type { Request, Response, NextFunction } from "express";
import type { DocumentCategory, DocumentStatus } from "./model.js";

export type DocumentRecord = {
  id: string;
  patientId: string;
  clinicId: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  category: DocumentCategory;
  status: DocumentStatus;
  uploadedBy: string;
  description: string;
  tags: string[];
  storageUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type AttachmentRecord = {
  id: string;
  documentId: string;
  patientId: string;
  clinicId: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  storageKey: string;
  uploadedBy: string;
  createdAt: string;
};

export type CreateDocumentBody = Omit<DocumentRecord, "id" | "clinicId" | "status" | "createdAt" | "updatedAt">;

export type UpdateDocumentBody = Partial<Omit<DocumentRecord, "id" | "patientId" | "clinicId" | "createdAt" | "updatedAt">>;

export type UploadAttachmentBody = Omit<AttachmentRecord, "id" | "createdAt">;

export type DocumentsService = {
  findByPatientId(patientId: string, clinicId: string): DocumentRecord[];
  findById(documentId: string, clinicId: string): DocumentRecord | undefined;
  create(patientId: string, clinicId: string, data: CreateDocumentBody): DocumentRecord;
  update(documentId: string, clinicId: string, data: UpdateDocumentBody): DocumentRecord | undefined;
  delete(documentId: string, clinicId: string): boolean;
  getAttachments(documentId: string, clinicId: string): AttachmentRecord[];
  addAttachment(documentId: string, clinicId: string, data: UploadAttachmentBody): AttachmentRecord | undefined;
  removeAttachment(documentId: string, attachmentId: string, clinicId: string): boolean;
};

const docStore = new Map<string, DocumentRecord>();
const attStore = new Map<string, AttachmentRecord[]>();

function docKey(id: string, clinicId: string): string {
  return `${clinicId}::${id}`;
}

function patientKey(patientId: string, clinicId: string): string {
  return `${clinicId}::${patientId}`;
}

function attKey(documentId: string, clinicId: string): string {
  return `${clinicId}::${documentId}`;
}

const patientIndex = new Map<string, string[]>();

export function createDocumentsService(): DocumentsService {
  return {
    findByPatientId(patientId: string, clinicId: string) {
      const keys = patientIndex.get(patientKey(patientId, clinicId)) || [];
      return keys.map((k) => docStore.get(k)).filter(Boolean) as DocumentRecord[];
    },

    findById(documentId: string, clinicId: string) {
      return docStore.get(docKey(documentId, clinicId));
    },

    create(patientId: string, clinicId: string, data: CreateDocumentBody) {
      const now = new Date().toISOString();
      const id = `doc_${Date.now()}`;
      const record: DocumentRecord = {
        id,
        patientId,
        clinicId,
        status: "pending",
        ...data,
        tags: data.tags || [],
        createdAt: now,
        updatedAt: now,
      };
      docStore.set(docKey(id, clinicId), record);
      const pk = patientKey(patientId, clinicId);
      const existing = patientIndex.get(pk) || [];
      existing.push(docKey(id, clinicId));
      patientIndex.set(pk, existing);
      return record;
    },

    update(documentId: string, clinicId: string, data: UpdateDocumentBody) {
      const existing = docStore.get(docKey(documentId, clinicId));
      if (!existing) return undefined;
      const updated: DocumentRecord = {
        ...existing,
        ...data,
        tags: data.tags || existing.tags,
        updatedAt: new Date().toISOString(),
      };
      docStore.set(docKey(documentId, clinicId), updated);
      return updated;
    },

    delete(documentId: string, clinicId: string) {
      const record = docStore.get(docKey(documentId, clinicId));
      if (!record) return false;
      docStore.delete(docKey(documentId, clinicId));
      const pk = patientKey(record.patientId, clinicId);
      const keys = (patientIndex.get(pk) || []).filter((k) => k !== docKey(documentId, clinicId));
      if (keys.length) patientIndex.set(pk, keys);
      else patientIndex.delete(pk);
      attStore.delete(attKey(documentId, clinicId));
      return true;
    },

    getAttachments(documentId: string, clinicId: string) {
      return attStore.get(attKey(documentId, clinicId)) || [];
    },

    addAttachment(documentId: string, clinicId: string, data: UploadAttachmentBody) {
      if (!docStore.has(docKey(documentId, clinicId))) return undefined;
      const now = new Date().toISOString();
      const attachment: AttachmentRecord = {
        id: `att_${Date.now()}`,
        ...data,
        createdAt: now,
      };
      const existing = attStore.get(attKey(documentId, clinicId)) || [];
      existing.push(attachment);
      attStore.set(attKey(documentId, clinicId), existing);
      return attachment;
    },

    removeAttachment(documentId: string, attachmentId: string, clinicId: string) {
      const existing = attStore.get(attKey(documentId, clinicId));
      if (!existing) return false;
      const filtered = existing.filter((a) => a.id !== attachmentId);
      if (filtered.length === existing.length) return false;
      if (filtered.length) attStore.set(attKey(documentId, clinicId), filtered);
      else attStore.delete(attKey(documentId, clinicId));
      return true;
    },
  };
}

const service = createDocumentsService();

export function documentsRouter(req: Request, res: Response, next: NextFunction) {
  const { patientId, documentId, attachmentId } = req.params;
  const clinicId = (req.headers["x-clinic-id"] as string) || "default";
  const method = req.method.toUpperCase();

  if (method === "GET" && patientId && !documentId) {
    const records = service.findByPatientId(patientId, clinicId);
    res.json(records);
    return;
  }

  if (method === "GET" && documentId && !attachmentId) {
    const record = service.findById(documentId, clinicId);
    if (!record) { res.status(404).json({ error: "NOT_FOUND" }); return; }
    res.json(record);
    return;
  }

  if (method === "GET" && documentId && attachmentId === "attachments") {
    const attachments = service.getAttachments(documentId, clinicId);
    res.json(attachments);
    return;
  }

  if (method === "POST" && patientId && !documentId) {
    const record = service.create(patientId, clinicId, req.body as CreateDocumentBody);
    res.status(201).json(record);
    return;
  }

  if (method === "POST" && documentId && attachmentId === "attachments") {
    const attachment = service.addAttachment(documentId, clinicId, req.body as UploadAttachmentBody);
    if (!attachment) { res.status(404).json({ error: "DOCUMENT_NOT_FOUND" }); return; }
    res.status(201).json(attachment);
    return;
  }

  if (method === "PATCH" && documentId) {
    const record = service.update(documentId, clinicId, req.body as UpdateDocumentBody);
    if (!record) { res.status(404).json({ error: "NOT_FOUND" }); return; }
    res.json(record);
    return;
  }

  if (method === "DELETE" && documentId && !attachmentId) {
    const ok = service.delete(documentId, clinicId);
    if (!ok) { res.status(404).json({ error: "NOT_FOUND" }); return; }
    res.json({ ok: true });
    return;
  }

  if (method === "DELETE" && documentId && attachmentId) {
    const ok = service.removeAttachment(documentId, attachmentId, clinicId);
    if (!ok) { res.status(404).json({ error: "NOT_FOUND" }); return; }
    res.json({ ok: true });
    return;
  }

  next();
}
