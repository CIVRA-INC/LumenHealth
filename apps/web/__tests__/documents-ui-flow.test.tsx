import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";

type UploadStep = "select-file" | "metadata" | "review";
type DocumentForm = {
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  category: string;
  description: string;
  tags: string;
};

function validateStep(step: UploadStep, data: DocumentForm): string[] {
  const errs: string[] = [];
  if (step === "select-file") {
    if (!data.fileName.trim()) errs.push("File name is required");
    if (!data.fileType.trim()) errs.push("File type is required");
    if (data.fileSizeBytes <= 0) errs.push("File size is required");
  }
  if (step === "metadata") {
    if (!data.category) errs.push("Category is required");
  }
  return errs;
}

function getNext(current: UploadStep): UploadStep | null {
  const steps: UploadStep[] = ["select-file", "metadata", "review"];
  const idx = steps.indexOf(current);
  return idx < steps.length - 1 ? steps[idx + 1] : null;
}

function getPrev(current: UploadStep): UploadStep | null {
  const steps: UploadStep[] = ["select-file", "metadata", "review"];
  const idx = steps.indexOf(current);
  return idx > 0 ? steps[idx - 1] : null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

const categoryOptions = [
  { label: "Clinical", value: "clinical" },
  { label: "Lab Report", value: "lab-report" },
  { label: "Imaging", value: "imaging" },
  { label: "Consent Form", value: "consent-form" },
];

describe("Documents UI Flow", () => {
  describe("validateStep", () => {
    const validFile: DocumentForm = {
      fileName: "report.pdf",
      fileType: "application/pdf",
      fileSizeBytes: 102400,
      category: "lab-report",
      description: "Test report",
      tags: "lab, test",
    };

    it("returns no errors for valid file step", () => {
      expect(validateStep("select-file", validFile)).toEqual([]);
    });

    it("requires file name on select-file step", () => {
      const errors = validateStep("select-file", { ...validFile, fileName: "" });
      expect(errors).toContain("File name is required");
    });

    it("requires file type on select-file step", () => {
      const errors = validateStep("select-file", { ...validFile, fileType: "" });
      expect(errors).toContain("File type is required");
    });

    it("requires file size on select-file step", () => {
      const errors = validateStep("select-file", { ...validFile, fileSizeBytes: 0 });
      expect(errors).toContain("File size is required");
    });

    it("requires category on metadata step", () => {
      const errors = validateStep("metadata", { ...validFile, category: "" });
      expect(errors).toContain("Category is required");
    });

    it("returns no errors for valid metadata step", () => {
      expect(validateStep("metadata", validFile)).toEqual([]);
    });

    it("returns no errors for review step", () => {
      expect(validateStep("review", validFile)).toEqual([]);
    });
  });

  describe("getNext", () => {
    it("returns metadata after select-file", () => {
      expect(getNext("select-file")).toBe("metadata");
    });

    it("returns review after metadata", () => {
      expect(getNext("metadata")).toBe("review");
    });

    it("returns null after review", () => {
      expect(getNext("review")).toBeNull();
    });
  });

  describe("getPrev", () => {
    it("returns null before select-file", () => {
      expect(getPrev("select-file")).toBeNull();
    });

    it("returns select-file from metadata", () => {
      expect(getPrev("metadata")).toBe("select-file");
    });

    it("returns metadata from review", () => {
      expect(getPrev("review")).toBe("metadata");
    });
  });

  describe("formatFileSize", () => {
    it("formats bytes", () => {
      expect(formatFileSize(500)).toBe("500 B");
    });

    it("formats kilobytes", () => {
      expect(formatFileSize(2048)).toBe("2.0 KB");
    });

    it("formats megabytes", () => {
      expect(formatFileSize(1048576)).toBe("1.0 MB");
    });
  });

  describe("categoryOptions", () => {
    it("contains expected categories", () => {
      const values = categoryOptions.map((o) => o.value);
      expect(values).toContain("clinical");
      expect(values).toContain("lab-report");
      expect(values).toContain("imaging");
      expect(values).toContain("consent-form");
    });
  });
});
