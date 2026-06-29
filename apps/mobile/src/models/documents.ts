export type DocumentCategory = "clinical" | "administrative" | "lab-report" | "imaging" | "consent-form" | "other";

export type DocumentStatus = "pending" | "uploaded" | "verified" | "archived";

export type Document = {
  id: string;
  patientId: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  category: DocumentCategory;
  status: DocumentStatus;
  description: string;
  tags: string[];
  uploadedAt: string;
};

export type Attachment = {
  id: string;
  documentId: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  uploadedAt: string;
};

export type DocumentSummary = {
  id: string;
  fileName: string;
  category: DocumentCategory;
  status: DocumentStatus;
  fileSizeLabel: string;
};

export function calculateFileSizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function documentToSummary(d: Document): DocumentSummary {
  return {
    id: d.id,
    fileName: d.fileName,
    category: d.category,
    status: d.status,
    fileSizeLabel: calculateFileSizeLabel(d.fileSizeBytes),
  };
}

export function validateDocumentRecord(data: Partial<Document>): string[] {
  const errors: string[] = [];
  if (!data.fileName) errors.push("File name is required");
  if (!data.category) errors.push("Category is required");
  if (!data.fileSizeBytes || data.fileSizeBytes <= 0) errors.push("File size is required");
  return errors;
}

export const defaultDocument: Document = {
  id: "",
  patientId: "",
  fileName: "",
  fileType: "",
  fileSizeBytes: 0,
  category: "other",
  status: "pending",
  description: "",
  tags: [],
  uploadedAt: "",
};

export const categoryOptions: { label: string; value: DocumentCategory }[] = [
  { label: "Clinical", value: "clinical" },
  { label: "Administrative", value: "administrative" },
  { label: "Lab Report", value: "lab-report" },
  { label: "Imaging", value: "imaging" },
  { label: "Consent Form", value: "consent-form" },
  { label: "Other", value: "other" },
];

export const statusOptions: { label: string; value: DocumentStatus }[] = [
  { label: "Pending", value: "pending" },
  { label: "Uploaded", value: "uploaded" },
  { label: "Verified", value: "verified" },
  { label: "Archived", value: "archived" },
];
