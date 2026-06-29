import type { Request, Response } from "express";

type DocumentRecord = {
  id: string;
  patientId: string;
  clinicId: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  category: string;
  status: string;
  uploadedBy: string;
  description: string;
  tags: string[];
  storageUrl: string;
  createdAt: string;
  updatedAt: string;
};

type CreateDocumentInput = Omit<DocumentRecord, "id" | "clinicId" | "status" | "createdAt" | "updatedAt">;

const db = new Map<string, DocumentRecord[]>();
const k = (pid: string) => pid;

function getDocuments(patientId: string): DocumentRecord[] {
  return db.get(k(patientId)) || [];
}

const validCategories = ["clinical", "administrative", "lab-report", "imaging", "consent-form", "other"];

export function handleCreateDocument(req: Request, res: Response) {
  const body = req.body as CreateDocumentInput;
  if (!body.fileName || !body.fileType || !body.category) {
    res.status(400).json({ error: "VALIDATION_ERROR", message: "fileName, fileType, and category are required" });
    return;
  }
  if (!validCategories.includes(body.category)) {
    res.status(400).json({ error: "VALIDATION_ERROR", message: "category is not valid" });
    return;
  }
  const now = new Date().toISOString();
  const doc: DocumentRecord = {
    id: `doc_${Date.now()}`,
    patientId: req.params.patientId,
    clinicId: (req.headers["x-clinic-id"] as string) || "default",
    status: "pending",
    ...body,
    tags: body.tags || [],
    createdAt: now,
    updatedAt: now,
  };
  const docs = getDocuments(req.params.patientId);
  docs.push(doc);
  db.set(k(req.params.patientId), docs);
  res.status(201).json(doc);
}

export function handleListDocuments(req: Request, res: Response) {
  const docs = getDocuments(req.params.patientId);
  if (docs.length === 0) { res.status(404).json({ error: "NOT_FOUND" }); return; }
  res.json(docs);
}

export function handleGetDocument(req: Request, res: Response) {
  const docs = getDocuments(req.params.patientId);
  const doc = docs.find((d) => d.id === req.params.documentId);
  if (!doc) { res.status(404).json({ error: "NOT_FOUND" }); return; }
  res.json(doc);
}

export function handleDeleteDocument(req: Request, res: Response) {
  const docs = getDocuments(req.params.patientId);
  const idx = docs.findIndex((d) => d.id === req.params.documentId);
  if (idx === -1) { res.status(404).json({ error: "NOT_FOUND" }); return; }
  docs.splice(idx, 1);
  db.set(k(req.params.patientId), docs);
  res.json({ ok: true });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function validateCategory(category: string): boolean {
  return validCategories.includes(category);
}

const validDocument = {
  patientId: "pat_tf_01",
  fileName: "lab-result.pdf",
  fileType: "application/pdf",
  fileSizeBytes: 245760,
  category: "lab-report",
  uploadedBy: "staff_01",
  description: "Complete blood count",
  tags: ["lab", "blood"],
  storageUrl: "https://storage.example.com/lab-result.pdf",
};

describe("Documents API — Tests & Fixtures", () => {
  let res: Partial<Response>;
  let json: jest.Mock;
  let status: jest.Mock;

  beforeEach(() => {
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
    res = { status, json };
    db.clear();
  });

  it("creates a document record", () => {
    handleCreateDocument({ params: { patientId: "pat_tf_01" }, headers: { "x-clinic-id": "clinic_01" }, body: validDocument } as unknown as Request, res as Response);
    expect(status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ patientId: "pat_tf_01", status: "pending" }));
  });

  it("rejects document without required fields", () => {
    handleCreateDocument({ params: { patientId: "pat_tf_01" }, headers: {}, body: {} } as unknown as Request, res as Response);
    expect(status).toHaveBeenCalledWith(400);
  });

  it("rejects document with invalid category", () => {
    handleCreateDocument({ params: { patientId: "pat_tf_01" }, headers: {}, body: { ...validDocument, category: "invalid" } } as unknown as Request, res as Response);
    expect(status).toHaveBeenCalledWith(400);
  });

  it("lists documents for a patient", () => {
    handleCreateDocument({ params: { patientId: "pat_tf_01" }, headers: { "x-clinic-id": "clinic_01" }, body: validDocument } as unknown as Request, res as Response);
    handleListDocuments({ params: { patientId: "pat_tf_01" } } as unknown as Request, res as Response);
    const docs = (json.mock.calls[json.mock.calls.length - 1][0] as DocumentRecord[]);
    expect(docs).toHaveLength(1);
  });

  it("returns 404 for missing patient documents", () => {
    handleListDocuments({ params: { patientId: "pat_missing" } } as unknown as Request, res as Response);
    expect(status).toHaveBeenCalledWith(404);
  });

  it("gets a specific document by id", () => {
    handleCreateDocument({ params: { patientId: "pat_tf_01" }, headers: { "x-clinic-id": "clinic_01" }, body: validDocument } as unknown as Request, res as Response);
    const created = (json.mock.calls[0][0] as DocumentRecord);
    handleGetDocument({ params: { patientId: "pat_tf_01", documentId: created.id } } as unknown as Request, res as Response);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ id: created.id }));
  });

  it("deletes a document", () => {
    handleCreateDocument({ params: { patientId: "pat_tf_01" }, headers: { "x-clinic-id": "clinic_01" }, body: validDocument } as unknown as Request, res as Response);
    const created = (json.mock.calls[0][0] as DocumentRecord);
    handleDeleteDocument({ params: { patientId: "pat_tf_01", documentId: created.id } } as unknown as Request, res as Response);
    expect(json).toHaveBeenCalledWith({ ok: true });
  });

  it("returns 404 when deleting non-existent document", () => {
    handleDeleteDocument({ params: { patientId: "pat_tf_01", documentId: "doc_nonexistent" } } as unknown as Request, res as Response);
    expect(status).toHaveBeenCalledWith(404);
  });

  it("formats file size correctly", () => {
    expect(formatFileSize(500)).toBe("500 B");
    expect(formatFileSize(2048)).toBe("2.0 KB");
    expect(formatFileSize(1048576)).toBe("1.0 MB");
  });

  it("validates category", () => {
    expect(validateCategory("lab-report")).toBe(true);
    expect(validateCategory("imaging")).toBe(true);
    expect(validateCategory("invalid")).toBe(false);
  });
});

export { validDocument as fixtures };
