export type DocumentCategory = "clinical" | "administrative" | "lab-report" | "imaging" | "consent-form" | "other";

export type DocumentStatus = "pending" | "uploaded" | "verified" | "archived";

export type DocumentFormData = {
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  category: DocumentCategory | "";
  description: string;
  tags: string;
  storageUrl: string;
};

export type AttachmentFormData = {
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  storageKey: string;
};

export const initialDocumentForm: DocumentFormData = {
  fileName: "",
  fileType: "",
  fileSizeBytes: 0,
  category: "",
  description: "",
  tags: "",
  storageUrl: "",
};

export const initialAttachmentForm: AttachmentFormData = {
  fileName: "",
  mimeType: "",
  fileSizeBytes: 0,
  storageKey: "",
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

export function documentFormToPayload(form: DocumentFormData): Record<string, unknown> {
  return {
    fileName: form.fileName,
    fileType: form.fileType,
    fileSizeBytes: form.fileSizeBytes,
    category: form.category,
    description: form.description,
    tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    storageUrl: form.storageUrl,
  };
}

export function validateDocumentForm(form: DocumentFormData): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.fileName.trim()) errors.fileName = "File name is required";
  if (!form.fileType.trim()) errors.fileType = "File type is required";
  if (!form.fileSizeBytes || form.fileSizeBytes <= 0) errors.fileSizeBytes = "File size must be greater than 0";
  if (!form.category) errors.category = "Category is required";
  return errors;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function formatTags(tags: string[]): string {
  return tags.join(", ");
}
