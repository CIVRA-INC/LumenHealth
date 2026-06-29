export type DocumentsFlowState = {
  step: "idle" | "selecting" | "uploading" | "reviewing" | "submitting" | "success" | "error";
  patientId: string;
  editingDocumentId?: string;
  error?: string;
};

export type UploadStep = "select-file" | "metadata" | "review";

export type DocumentFormData = {
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  category: string;
  description: string;
  tags: string;
  storageUrl: string;
};

export type AttachmentFormData = {
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
};

export function getInitialFlowState(patientId: string): DocumentsFlowState {
  return { step: "idle", patientId };
}

export function getNextUploadStep(current: UploadStep): UploadStep | null {
  const steps: UploadStep[] = ["select-file", "metadata", "review"];
  const idx = steps.indexOf(current);
  return idx < steps.length - 1 ? steps[idx + 1] : null;
}

export function getPrevUploadStep(current: UploadStep): UploadStep | null {
  const steps: UploadStep[] = ["select-file", "metadata", "review"];
  const idx = steps.indexOf(current);
  return idx > 0 ? steps[idx - 1] : null;
}

export function validateUploadStep(step: UploadStep, data: Partial<DocumentFormData>): string[] {
  const errors: string[] = [];
  if (step === "select-file") {
    if (!data.fileName?.trim()) errors.push("File name is required");
    if (!data.fileType?.trim()) errors.push("File type is required");
    if (!data.fileSizeBytes || data.fileSizeBytes <= 0) errors.push("File size must be greater than 0");
  }
  if (step === "metadata") {
    if (!data.category?.trim()) errors.push("Category is required");
  }
  return errors;
}

export function flowReducer(state: DocumentsFlowState, action: { type: string; payload?: unknown }): DocumentsFlowState {
  switch (action.type) {
    case "START_UPLOAD":
      return { ...state, step: "uploading" };
    case "START_REVIEW":
      return { ...state, step: "reviewing" };
    case "SUBMIT":
      return { ...state, step: "submitting" };
    case "SUCCESS":
      return { ...state, step: "success", editingDocumentId: undefined };
    case "ERROR":
      return { ...state, step: "error", error: action.payload as string };
    case "RESET":
      return getInitialFlowState(state.patientId);
    default:
      return state;
  }
}

export const fixtures = {
  validFile: { fileName: "report.pdf", fileType: "application/pdf", fileSizeBytes: 102400, category: "lab-report", description: "Lab report", tags: "lab", storageUrl: "" } satisfies Partial<DocumentFormData>,
  missingFile: {} satisfies Partial<DocumentFormData>,
  validCategory: "lab-report",
  invalidCategory: "unknown-category",
};
