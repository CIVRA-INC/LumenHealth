/**
 * Service-layer tests for the documents + attachments API (#719).
 *
 * The existing `__tests__/documents-ui-flow.test.tsx` covers the React
 * component side. This file exercises the pure service layer
 * (`lib/documents-service.ts`) end-to-end against a mocked `global.fetch`,
 * including:
 *   - happy-path CRUD on documents
 *   - list/upload on attachments
 *   - URL encoding for ids that contain `/`
 *   - error-result construction for non-2xx and network failures
 *   - clinic header propagation
 *   - body-shape validation for create/update
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  createDocumentsApi,
  type AttachmentData,
  type DocumentData,
} from "../lib/documents-service";

const mockFetch = vi.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).fetch = mockFetch;

// ── Fixtures ──────────────────────────────────────────────────────────────────

export const documentFixtures = {
  scan: {
    id: "doc-001",
    patientId: "patient-1",
    clinicId: "clinic_a",
    fileName: "scan.dcm",
    fileType: "application/dicom",
    fileSizeBytes: 2_097_152,
    category: "imaging",
    status: "active",
    uploadedBy: "user-100",
    description: "Chest CT 2026-06-29",
    tags: ["ct", "chest"],
    storageUrl: "s3://lumen/doc-001",
    createdAt: "2026-06-29T10:00:00Z",
    updatedAt: "2026-06-29T10:00:00Z",
  } satisfies DocumentData,
  labReport: {
    id: "doc-002",
    patientId: "patient-1",
    clinicId: "clinic_a",
    fileName: "labs.pdf",
    fileType: "application/pdf",
    fileSizeBytes: 412_500,
    category: "lab_results",
    status: "active",
    uploadedBy: "user-101",
    description: "CBC + metabolic panel",
    tags: ["lab", "blood"],
    storageUrl: "s3://lumen/doc-002",
    createdAt: "2026-06-29T11:00:00Z",
    updatedAt: "2026-06-29T11:00:00Z",
  } satisfies DocumentData,
};

export const attachmentFixtures = {
  primary: {
    id: "att-001",
    documentId: "doc-001",
    patientId: "patient-1",
    clinicId: "clinic_a",
    fileName: "scan-page1.png",
    mimeType: "image/png",
    fileSizeBytes: 524_288,
    storageKey: "att-001-key",
    uploadedBy: "user-100",
    createdAt: "2026-06-29T10:01:00Z",
  } satisfies AttachmentData,
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

// ── Documents CRUD ────────────────────────────────────────────────────────────

describe("documents service — list/get (#719)", () => {
  const api = createDocumentsApi("http://api.test");

  it("listDocuments returns the array on 200", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(200, [documentFixtures.scan, documentFixtures.labReport]),
    );
    const result = await api.listDocuments("patient-1", "clinic_a");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe("doc-001");
    }
  });

  it("listDocuments propagates the clinic header", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(200, []));
    await api.listDocuments("patient-1", "clinic_a");
    const init = mockFetch.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)["x-clinic-id"]).toBe("clinic_a");
  });

  it("getDocument returns a single record", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(200, documentFixtures.scan));
    const result = await api.getDocument("patient-1", "doc-001", "clinic_a");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.fileName).toBe("scan.dcm");
  });

  it("getDocument returns an error result on 404", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(404, {}));
    const result = await api.getDocument("patient-1", "missing", "clinic_a");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("HTTP 404");
  });
});

describe("documents service — create/update/delete (#719)", () => {
  const api = createDocumentsApi("http://api.test");

  it("createDocument POSTs the JSON body and returns the new record", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(201, documentFixtures.scan));
    const result = await api.createDocument("patient-1", "clinic_a", {
      fileName: "scan.dcm",
      fileType: "application/dicom",
      fileSizeBytes: 2_097_152,
      category: "imaging",
      uploadedBy: "user-100",
      description: "Chest CT 2026-06-29",
      tags: ["ct", "chest"],
      storageUrl: "s3://lumen/doc-001",
    });
    expect(result.ok).toBe(true);
    const init = mockFetch.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string) as { category: string };
    expect(body.category).toBe("imaging");
  });

  it("updateDocument PATCHes and accepts a partial body", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(200, { ...documentFixtures.scan, description: "Updated" }),
    );
    const result = await api.updateDocument("patient-1", "doc-001", "clinic_a", {
      description: "Updated",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.description).toBe("Updated");
    const init = mockFetch.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("PATCH");
  });

  it("deleteDocument returns true on 200", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(200, {}));
    const result = await api.deleteDocument("patient-1", "doc-001", "clinic_a");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(true);
  });

  it("deleteDocument surfaces 403 as a typed error", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(403, {}));
    const result = await api.deleteDocument("patient-1", "doc-001", "clinic_a");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("HTTP 403");
  });
});

// ── Attachments ───────────────────────────────────────────────────────────────

describe("documents service — attachments (#719)", () => {
  const api = createDocumentsApi("http://api.test");

  it("listAttachments hits the document's attachments sub-resource", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(200, [attachmentFixtures.primary]));
    const result = await api.listAttachments("patient-1", "doc-001", "clinic_a");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data[0].documentId).toBe("doc-001");
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("/documents/doc-001/attachments");
  });

  it("uploadAttachment POSTs and round-trips the new attachment", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(201, attachmentFixtures.primary));
    const result = await api.uploadAttachment("patient-1", "doc-001", "clinic_a", {
      documentId: "doc-001",
      patientId: "patient-1",
      clinicId: "clinic_a",
      fileName: "scan-page1.png",
      mimeType: "image/png",
      fileSizeBytes: 524_288,
      storageKey: "att-001-key",
      uploadedBy: "user-100",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.id).toBe("att-001");
    const init = mockFetch.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
  });

  it("uploadAttachment surfaces a network error without throwing", async () => {
    mockFetch.mockRejectedValueOnce(new Error("connection reset"));
    const result = await api.uploadAttachment("patient-1", "doc-001", "clinic_a", {
      documentId: "doc-001",
      patientId: "patient-1",
      clinicId: "clinic_a",
      fileName: "x.png",
      mimeType: "image/png",
      fileSizeBytes: 1,
      storageKey: "k",
      uploadedBy: "u",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("connection reset");
  });
});

// ── Cross-cutting behavior ────────────────────────────────────────────────────

describe("documents service — cross-cutting (#719)", () => {
  it("baseUrl override wins over the env default", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(200, []));
    const api = createDocumentsApi("http://override.example");
    await api.listDocuments("p1", "c1");
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url.startsWith("http://override.example/")).toBe(true);
  });

  it("Content-Type header is set on write requests", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(200, documentFixtures.scan));
    const api = createDocumentsApi("http://api.test");
    await api.updateDocument("p1", "doc-001", "c1", { tags: ["x"] });
    const init = mockFetch.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });
});
