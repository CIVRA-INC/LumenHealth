export type DocumentUploadStep = "file" | "category" | "confirm" | "done";

export type DocumentEntry = {
  patientId: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  category: string;
  description: string;
  tags: string[];
};

export type StepState = {
  step: DocumentUploadStep;
  entry: DocumentEntry;
  errors: string[];
};

const emptyEntry: DocumentEntry = {
  patientId: "",
  fileName: "",
  fileType: "",
  fileSizeBytes: 0,
  category: "",
  description: "",
  tags: [],
};

export function createInitialState(): StepState {
  return { step: "file", entry: { ...emptyEntry }, errors: [] };
}

export function nextStep(current: DocumentUploadStep): DocumentUploadStep | null {
  const steps: DocumentUploadStep[] = ["file", "category", "confirm", "done"];
  const idx = steps.indexOf(current);
  return idx < steps.length - 1 ? steps[idx + 1] : null;
}

export function prevStep(current: DocumentUploadStep): DocumentUploadStep | null {
  const steps: DocumentUploadStep[] = ["file", "category", "confirm", "done"];
  const idx = steps.indexOf(current);
  return idx > 0 ? steps[idx - 1] : null;
}

export function validateStep(step: DocumentUploadStep, entry: DocumentEntry): string[] {
  const errors: string[] = [];
  if (step === "file") {
    if (!entry.fileName.trim()) errors.push("File name is required");
    if (!entry.fileType.trim()) errors.push("File type is required");
    if (entry.fileSizeBytes <= 0) errors.push("File size is required");
  }
  if (step === "category") {
    if (!entry.category.trim()) errors.push("Category is required");
  }
  return errors;
}

export function getSummary(entry: DocumentEntry): string {
  const sizeLabel = entry.fileSizeBytes >= 1048576
    ? `${(entry.fileSizeBytes / 1048576).toFixed(1)} MB`
    : entry.fileSizeBytes >= 1024
      ? `${(entry.fileSizeBytes / 1024).toFixed(1)} KB`
      : `${entry.fileSizeBytes} B`;
  return `${entry.fileName} (${sizeLabel}) — ${entry.category}`;
}

export const fixtures = {
  validFile: { fileName: "scan.dcm", fileType: "application/dicom", fileSizeBytes: 2097152 } as Partial<DocumentEntry>,
  validCategory: { category: "imaging" } as Partial<DocumentEntry>,
  invalidFile: { fileSizeBytes: 0 } as Partial<DocumentEntry>,
};
